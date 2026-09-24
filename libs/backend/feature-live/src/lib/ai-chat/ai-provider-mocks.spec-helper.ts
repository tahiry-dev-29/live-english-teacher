/** Mock call record captured by the provider doubles. */
export interface MockCallRecord {
  provider: string;
  content: string;
  apiKey?: string;
  audioData?: string;
  targetLanguage?: string;
  model?: string;
}

/** History entry shape accepted by the provider doubles. */
export interface MockHistoryItem {
  role: 'user' | 'model';
  text: string;
}

/** Shared doubles for ai-provider specs (mirrors AiProviderService routing). */

// ── Mock services ─────────────────────────────────────────────────────────────

export class MockGeminiLiveService {
  calls: MockCallRecord[] = [];

  async getGeminiChatResponse(
    history: MockHistoryItem[],
    content: string,
    audioData?: string,
    _mimeType?: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({
      provider: 'gemini',
      content,
      audioData,
      targetLanguage,
      model,
      apiKey,
    });
    return `### Gemini: ${content}`;
  }

  async *generateStream() {
    yield '### Gemini stream';
  }
}

export class MockGroqLiveService {
  calls: MockCallRecord[] = [];

  async getGroqChatResponse(
    history: MockHistoryItem[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({
      provider: 'groq',
      content,
      targetLanguage,
      model,
      apiKey,
    });
    return `### Groq: ${content}`;
  }

  async *generateStream(
    history: MockHistoryItem[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({ provider: 'groq-stream', content, apiKey });
    yield `Groq stream: ${content}`;
  }
}

export class MockOpenAiCompatService {
  calls: MockCallRecord[] = [];

  async getChatResponse(
    provider: string,
    history: MockHistoryItem[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({ provider, content, targetLanguage, model, apiKey });
    return `### OpenAI-compat (${provider}): ${content}`;
  }

  async *generateStream(
    provider: string,
    history: MockHistoryItem[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({ provider, content, apiKey });
    yield `Stream (${provider}): ${content}`;
  }
}
