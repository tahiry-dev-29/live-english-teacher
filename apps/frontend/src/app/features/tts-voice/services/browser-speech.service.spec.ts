import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserVoiceService } from './browser-voice.service';
import { BrowserSpeechService } from './browser-speech.service';

function voice(name: string, lang: string, def = false): SpeechSynthesisVoice {
  return { name, lang, default: def } as SpeechSynthesisVoice;
}

interface SpeechStub {
  voices: SpeechSynthesisVoice[];
  spoken: SpeechSynthesisUtterance[];
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  speaking: boolean;
  pending: boolean;
  paused: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
}

function installSpeechStub(voices: SpeechSynthesisVoice[]): SpeechStub {
  if (typeof SpeechSynthesisUtterance === 'undefined') {
    class UtteranceStub {
      text: string;
      voice: SpeechSynthesisVoice | null = null;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: ((e: Event) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      UtteranceStub as unknown as typeof SpeechSynthesisUtterance,
    );
  }
  const stub: SpeechStub = {
    voices,
    spoken: [],
    speak: vi.fn((u: SpeechSynthesisUtterance) => {
      stub.spoken.push(u);
      // Auto-fire onend in next microtask so chunk chaining works synchronously in tests
      queueMicrotask(() => u.onend?.(new Event('end')));
    }),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getVoices: vi.fn(() => stub.voices),
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: stub,
    configurable: true,
    writable: true,
  });
  return stub;
}

describe('BrowserVoiceService', () => {
  let service: BrowserVoiceService;
  let stub: SpeechStub;

  beforeEach(() => {
    localStorage.clear();
    stub = installSpeechStub([voice('A', 'en-US', true), voice('B', 'fr-FR')]);
    TestBed.configureTestingModule({ providers: [BrowserVoiceService] });
    service = TestBed.inject(BrowserVoiceService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads live voices and defaults the selection', () => {
    service.ensureVoices();
    expect(service.browserVoices().length).toBe(2);
    expect(service.selectedVoiceName()).toBe('A');
    expect(service.ready()).toBe(true);
  });

  it('persists the user selection', () => {
    service.ensureVoices();
    service.setSelectedVoiceName('B');
    expect(localStorage.getItem('tts_browser_voice')).toBe('B');
    expect(service.resolveVoice()?.name).toBe('B');
  });

  it('reports empty engine honestly', async () => {
    stub.voices = [];
    service.ensureVoices();
    expect(service.browserVoices()).toEqual([]);
    expect(service.ready()).toBe(false);
    await new Promise((r) => setTimeout(r, 700));
    expect(service.engineChecked()).toBe(true);
  });
});

describe('BrowserSpeechService', () => {
  let service: BrowserSpeechService;
  let stub: SpeechStub;

  beforeEach(() => {
    localStorage.clear();
    stub = installSpeechStub([voice('A', 'en-US', true)]);
    TestBed.configureTestingModule({
      providers: [BrowserVoiceService, BrowserSpeechService],
    });
    service = TestBed.inject(BrowserSpeechService);
  });

  it('speaks short text as one utterance with the selected voice', () => {
    let started = false;
    let ended = false;
    service.speak('Hello there.', {
      onStart: () => (started = true),
      onEnd: () => (ended = true),
    });
    expect(stub.spoken.length).toBe(1);
    expect(stub.spoken[0].voice?.name).toBe('A');
    expect(stub.spoken[0].lang).toBe('en-US');
    expect(started).toBe(true);
    stub.spoken[0].onend?.(new Event('end'));
    expect(ended).toBe(true);
    expect(service.active()).toBe(false);
  });

  it('chains chunks for long texts', async () => {
    const text =
      'First sentence is here and fairly long for testing purposes. ' +
      'Second sentence follows with even more words inside of it. ' +
      'Third arrives now with extra content too for good measure. ' +
      'Fourth keeps going strong without stopping at all. ' +
      'Fifth closes it all out finally with a proper ending.';
    expect(text.length).toBeGreaterThan(220);
    service.speak(text, {});
    expect(stub.spoken.length).toBe(1);
    // Wait for auto-fired onend to chain next chunk
    await new Promise((r) => queueMicrotask(r));
    expect(stub.spoken.length).toBe(2);
  });

  it('ends empty text immediately without touching the engine', () => {
    let ended = false;
    service.speak('   ', { onEnd: () => (ended = true) });
    expect(stub.spoken.length).toBe(0);
    expect(ended).toBe(true);
  });

  it('stops the chain on demand', async () => {
    // Install a stub that does NOT auto-fire onend: the chain stays active
    // until the test calls stop(), which is what we assert.
    const stub2: SpeechStub = {
      voices: [voice('A', 'en-US', true)],
      spoken: [],
      speak: vi.fn((u: SpeechSynthesisUtterance) => {
        stub2.spoken.push(u);
        // Do NOT auto-fire onend — keep the chain "running".
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: true,
      pending: true,
      paused: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getVoices: vi.fn(() => stub2.voices),
    };
    Object.defineProperty(window, 'speechSynthesis', {
      value: stub2,
      configurable: true,
      writable: true,
    });

    service.speak('Hello there. '.repeat(30), {});
    // Wait for speak to initialize
    await new Promise((r) => queueMicrotask(r));
    expect(service.active()).toBe(true);
    service.stop();
    expect(service.active()).toBe(false);
    expect(stub2.cancel).toHaveBeenCalled();
  });
});
