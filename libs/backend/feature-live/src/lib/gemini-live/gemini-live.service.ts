import { Injectable, Logger } from '@nestjs/common';

// NOTE: In a real environment, load this from a config service or .env file.
const GEMINI_API_KEY = process.env['GEMINI_API_KEY']; 
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash-preview-09-2025';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

@Injectable()
export class GeminiLiveService {
  private readonly logger = new Logger(GeminiLiveService.name);
  private readonly apiUrlBase = process.env['apiUrlBase'];

  // System instruction: Define the AI English tutor persona
  private readonly systemInstruction = {
    parts: [{
      text: "You are a friendly, patient, and knowledgeable AI English tutor. Your goal is to help the user practice English conversation and grammar. Keep your responses encouraging, correct any major mistakes politely, and introduce new vocabulary or grammar concepts naturally. Keep your responses concise for a smooth conversation flow."
    }]
  };

  /**
   * Builds the payload for the Gemini generateContent API call.
   * @param history The conversation history.
   * @param newMessage The latest user message.
   * @returns The payload object.
   */
  private buildPayload(
    history: { role: 'user' | 'model', text: string }[],
    newMessage: string,
    audioData?: string,
    mimeType?: string
  ) {
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const userParts: any[] = [];
    if (newMessage) {
      userParts.push({ text: newMessage });
    }
    if (audioData && mimeType) {
      userParts.push({
        inlineData: {
          mimeType: mimeType,
          data: audioData,
        },
      });
    }

    if (userParts.length > 0) {
      contents.push({
        role: 'user',
        parts: userParts,
      });
    }

    return {
      contents,
      systemInstruction: this.systemInstruction,
    };
  }

  /**
   * Generates a textual response from Gemini for the chat interaction.
   */
  async getGeminiChatResponse(
    history: { role: 'user' | 'model', text: string }[],
    newMessage: string,
    audioData?: string,
    mimeType?: string
  ): Promise<string> {
    const baseUrl = this.apiUrlBase || 'https://generativelanguage.googleapis.com/v1beta/models/';
    const apiUrl = `${baseUrl}${GEMINI_CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    this.logger.log(`Using Base URL: ${baseUrl}`);
    this.logger.log(`Requesting Chat from: ${apiUrl.replace(GEMINI_API_KEY || '', '***')}`);
    const payload = this.buildPayload(history, newMessage, audioData, mimeType);

    // Implementation of the API call with exponential backoff for resilience
    try {
      this.logger.log(`Sending chat request to ${GEMINI_CHAT_MODEL}`);
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (text) {
             this.logger.log('Gemini chat response received.');
             return text;
          }
          this.logger.warn('Gemini response was okay but content was empty.');
          return "I'm sorry, I couldn't generate a response right now. Could you try asking something else?";
        }

        this.logger.error(`API Error (Attempt ${attempt + 1}): ${response.status} - ${response.statusText}`);
        attempt++;
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            this.logger.log(`Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw new Error('Failed to get response from Gemini after multiple retries.');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in getGeminiChatResponse: ${error.message}`);
      } else {
        this.logger.error(`Error in getGeminiChatResponse: ${String(error)}`);
      }
      return "I'm experiencing connectivity issues. Please try again later.";
    }
  }

  /**
   * Generates TTS audio data from a given text.
   */
  async getGeminiTtsAudio(text: string): Promise<{ audioData: string, mimeType: string } | null> {
    const baseUrl = this.apiUrlBase || 'https://generativelanguage.googleapis.com/v1beta/models/';
    const apiUrl = `${baseUrl}${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    this.logger.log(`Using Base URL: ${baseUrl}`);
    this.logger.log(`Requesting TTS from: ${apiUrl.replace(GEMINI_API_KEY || '', '***')}`);
    
    // Using a clear and friendly voice (e.g., 'Kore')
    const payload = {
        contents: [{
            parts: [{ text: text }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Kore" }
                }
            }
        },
    };

    // Implementation of the API call with exponential backoff for resilience
    try {
      this.logger.log(`Sending TTS request to ${GEMINI_TTS_MODEL}`);
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const part = result?.candidates?.[0]?.content?.parts?.[0];
          const audioData = part?.inlineData?.data;
          const mimeType = part?.inlineData?.mimeType;

          if (audioData && mimeType) {
              this.logger.log(`Gemini TTS audio received. MimeType: ${mimeType}, DataLength: ${audioData.length}`);
              return { audioData, mimeType };
          }
          this.logger.warn('Gemini TTS response was okay but content was empty.');
          return null;
        }

        const errorBody = await response.text();
        this.logger.error(`TTS API Error (Attempt ${attempt + 1}): ${response.status} - ${response.statusText}`);
        this.logger.error(`Error Body: ${errorBody}`);
        
        attempt++;
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            this.logger.log(`Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw new Error('Failed to get TTS audio after multiple retries.');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in getGeminiTtsAudio: ${error.message}`);
      } else {
        this.logger.error(`Error in getGeminiTtsAudio: ${String(error)}`);
      }
      return null;
    }
  }
}