import type { Logger } from '@nestjs/common';
import { postJson, extractResponseText } from './gemini-live.util';
import { QuotaExceededError } from '../groq-live/groq-live.service';
import { BACKEND_MESSAGES } from '../../shared/messages';

type Log = Pick<Logger, 'log' | 'warn' | 'error'>;

/** Chat POST with exponential-backoff retry (pure transport). */
export async function postGeminiWithRetry(
  url: string,
  payload: unknown,
  options: { isUserKey?: boolean; logger: Log },
): Promise<string> {
  const { isUserKey, logger } = options;
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await postJson(url, payload);
    if (response.ok) {
      const text = extractResponseText(await response.json());
      if (text) {
        logger.log(BACKEND_MESSAGES.log.geminiChatReceived);
        return text;
      }
      logger.warn(BACKEND_MESSAGES.log.geminiEmptyContent);
      return BACKEND_MESSAGES.error.geminiEmptyResponse;
    }
    // Quota exhausted on server key → signal frontend to ask for user key.
    if ((response.status === 429 || response.status === 402) && !isUserKey) {
      throw new QuotaExceededError('gemini');
    }
    logger.error(
      `API Error (Attempt ${attempt + 1}): ${response.status} - ${response.statusText}`,
    );
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt + 1) * 1000;
      logger.log(`Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(BACKEND_MESSAGES.error.geminiRetriesExhausted);
}
