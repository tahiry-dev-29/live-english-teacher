import { Injectable, inject } from '@angular/core';
import { LoggingService } from '@core/services/logging.service';
import { NotificationService } from '@core/services/notification.service';
import { MESSAGES, MESSAGE_TEMPLATES } from '@core/constants/messages';
import { formatApiError } from '@core/utils/api-error.util';

/**
 * Minimal HTTP/SSE error interception layer (Task 32.5).
 * Apollo has no link chain in this app (GraphQL via plain httpResource/fetch),
 * so this service exposes wrappers used by fetch-based call-sites:
 * - get/postJson(): retry 1x on 5xx, else toast + log.
 * - sseErrors(): maps SSE error payloads to user messages.
 */
@Injectable({ providedIn: 'root' })
export class ErrorInterceptorService {
  private readonly logger = inject(LoggingService);
  private readonly notifications = inject(NotificationService);

  async fetchWithErrors(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      const first = await fetch(input, init);
      if (first.ok) return first;
      if (first.status >= 500) {
        const retry = await fetch(input, init);
        if (retry.ok) return retry;
        return this.rejectHttp(retry);
      }
      return this.rejectHttp(first);
    } catch (error) {
      const text = MESSAGES.error.networkUnreachable;
      this.logger.error(MESSAGES.log.streamFailed, error);
      this.notifications.error(text);
      throw new Error(text);
    }
  }

  notifySseError(raw: string, status?: number): string {
    const text =
      status !== undefined && raw === ''
        ? MESSAGE_TEMPLATES.streamRequestFailed(status)
        : formatApiError(raw);
    this.notifications.error(text);
    return text;
  }

  private async rejectHttp(response: Response): Promise<never> {
    const raw = await response.text().catch(() => '');
    const text = formatApiError(raw || `HTTP ${response.status}`);
    this.logger.error(MESSAGES.log.streamFailed, {
      status: response.status,
      body: raw.slice(0, 200),
    });
    this.notifications.error(text);
    throw new Error(text);
  }
}
