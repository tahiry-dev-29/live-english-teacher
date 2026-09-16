import { Injectable, Logger } from '@nestjs/common';

export interface DiscoveredAiModel {
  id: string;
  name: string;
  provider: 'groq' | 'gemini';
  description: string;
  size?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

interface GroqRawModel {
  id: string;
  active?: boolean;
  context_window?: number;
  owned_by?: string;
}

interface GeminiRawModel {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
}

@Injectable()
export class AiModelsService {
  private readonly logger = new Logger(AiModelsService.name);

  private readonly defaultGroqKey = process.env['GROQ_API_KEY'] || '';
  private readonly defaultGeminiKey = process.env['GEMINI_API_KEY'] || '';

  private readonly fallbackGroqModels: DiscoveredAiModel[] = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      description: 'High intelligence & complex reasoning',
      size: '70B',
      contextWindow: 131072,
      isDefault: true,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'groq',
      description: 'Ultra-fast low-latency responses',
      size: '8B',
      contextWindow: 131072,
    },
  ];

  private readonly fallbackGeminiModels: DiscoveredAiModel[] = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      description: "Google's high speed & multimodal model",
      size: 'Flash',
      isDefault: true,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      description: 'Next-gen multimodal reasoning',
      size: 'Flash',
    },
  ];

  async getModels(
    options: {
      groqApiKey?: string;
      geminiApiKey?: string;
      provider?: 'groq' | 'gemini';
    } = {}
  ): Promise<DiscoveredAiModel[]> {
    const groqKey = options.groqApiKey || this.defaultGroqKey;
    const geminiKey = options.geminiApiKey || this.defaultGeminiKey;

    const [groqModels, geminiModels] = await Promise.all([
      options.provider === 'gemini' ? [] : this.fetchGroqModels(groqKey),
      options.provider === 'groq' ? [] : this.fetchGeminiModels(geminiKey),
    ]);

    return [...groqModels, ...geminiModels];
  }

  private async fetchGroqModels(apiKey: string): Promise<DiscoveredAiModel[]> {
    if (!apiKey) return this.fallbackGroqModels;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        this.logger.warn(`Groq models API returned status ${response.status}`);
        return this.fallbackGroqModels;
      }

      const body = (await response.json()) as { data?: GroqRawModel[] };
      const rawList = body.data || [];

      const filtered = rawList.filter((m) => {
        const id = m.id.toLowerCase();
        if (m.active === false) return false;
        if (
          id.includes('whisper') ||
          id.includes('tts') ||
          id.includes('guard') ||
          id.includes('safeguard')
        ) {
          return false;
        }
        return (
          id.includes('llama') ||
          id.includes('mixtral') ||
          id.includes('gemma') ||
          id.includes('deepseek') ||
          id.includes('qwen')
        );
      });

      if (filtered.length === 0) return this.fallbackGroqModels;

      return filtered.map((m, idx) => ({
        id: m.id,
        name: this.formatGroqName(m.id),
        provider: 'groq' as const,
        description: `Context: ${
          m.context_window ? Math.round(m.context_window / 1024) + 'k' : '128k'
        } tokens · ${m.owned_by || 'Meta'}`,
        size: this.extractGroqSize(m.id),
        contextWindow: m.context_window,
        isDefault:
          idx === 0 || m.id.includes('70b') || m.id.includes('versatile'),
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch dynamic Groq models: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return this.fallbackGroqModels;
    }
  }

  private async fetchGeminiModels(
    apiKey: string
  ): Promise<DiscoveredAiModel[]> {
    if (!apiKey) return this.fallbackGeminiModels;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.warn(
          `Gemini models API returned status ${response.status}`
        );
        return this.fallbackGeminiModels;
      }

      const body = (await response.json()) as { models?: GeminiRawModel[] };
      const rawList = body.models || [];

      const filtered = rawList.filter((m) => {
        const name = m.name.toLowerCase();
        const methods = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent')) return false;
        if (
          name.includes('embedding') ||
          name.includes('aqa') ||
          name.includes('imagen') ||
          name.includes('robotics')
        ) {
          return false;
        }
        return name.includes('gemini');
      });

      if (filtered.length === 0) return this.fallbackGeminiModels;

      return filtered.map((m) => {
        const id = m.name.replace(/^models\//, '');
        return {
          id,
          name: m.displayName || id,
          provider: 'gemini' as const,
          description: m.description
            ? m.description.slice(0, 100)
            : 'Google Gemini model',
          size: id.includes('pro') ? 'Pro' : 'Flash',
          isDefault: id === 'gemini-2.5-flash' || id === 'gemini-2.0-flash',
        };
      });
    } catch (error) {
      this.logger.warn(
        `Failed to fetch dynamic Gemini models: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return this.fallbackGeminiModels;
    }
  }

  private formatGroqName(id: string): string {
    return id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private extractGroqSize(id: string): string | undefined {
    const match = id.match(/(\d+b)/i);
    return match ? match[1].toUpperCase() : undefined;
  }
}
