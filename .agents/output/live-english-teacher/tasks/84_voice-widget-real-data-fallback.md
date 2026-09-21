# Task 84 — Voice widget: real data, retry, visualizer, Web Speech fallback

**Status: DONE**
**Priority:** 🔴 Haute (cœur voix)

## Goal

`app-voice-control` must be real and interactive:

1. **Play button**: on TTS API failure → retry the TTS API call; while the
   `httpResource`/fetch is `.loading`, show a loading spinner icon; when audio
   plays fine → normal play/pause.
2. **Center graph**: replace the fake random waveform with a real
   visualization (Web Audio `AnalyserNode` frequency bars from the actual
   playing `<audio>`; animated state-driven bars for Web Speech utterances).
3. **Fallback**: audio always falls back to Google Web Speech callback when the
   API fails — in message playback AND in live call (`voice-call` path).
4. **Settings > Voices tab**: voice listSelectable + previewable via the live
   Google Web Speech API (`speechSynthesis.getVoices()` + `voiceschanged`),
   NOT a hardcoded registry list.
5. **STT recognition model** in the dialog adapts its option list to the
   selected TTS provider.

## Work

- `tts.service.ts`: expose `isLoading: signal<boolean>`,
  `analyserLevels: signal<number[]>` (AnalyserNode + rAF while `<audio>` plays),
  `lastTtsFailed: signal<boolean>`, `retryLast()`.
- `voice-control-component.ts`: `loading` + `ttsFailed` + `levels` inputs;
  `LucideLoader` spinner while loading; `retryRequested` output on
  play-press-after-error; real bars replace the random `generateWaveform()`.
- `chat-container` / `chat-page`: forward `ttsService.isLoading/lastTtsFailed/analyserLevels`
  and handle `retryAudio`.
- Voices tab: browser voices stay the modular `BrowserVoicePickerComponent`
  (live `speechSynthesis.getVoices()` + warmup, per-voice preview) and
  `VoiceLiveTestComponent`; STT option list made provider-aware
  (`sttModelOptions` computed on `selectedProviderId`).

## Acceptance Criteria

- [x] TTS API down → 1 retry from play button, spinner during load, then
      Web Speech speaks the text (no dead silence).
- [x] Waveform bars move with the real audio (frozen when paused).
- [x] Voices tab lists the actual browser voices; preview plays each one.
- [x] Changing TTS provider updates the STT language options (browser/openai/google/default).
- [x] `nx build frontend` OK (verified 2026-09-21: `pnpm build` success, 41 frontend tests pass).
