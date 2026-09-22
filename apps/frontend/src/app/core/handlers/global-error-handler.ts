import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggingService } from '@core/services/logging.service';
import { NotificationService } from '@core/services/notification.service';

/**
 * Global error boundary (Task 32.6): window errors go to logs only,
 * network online/offline transitions surface a user toast.
 */
@Injectable()
export class GlobalErrorHandler extends ErrorHandler {
  private readonly logger = inject(LoggingService);
  private readonly notifications = inject(NotificationService);

  override handleError(error: unknown): void {
    this.logger.error('Unhandled application error', error);
  }

  notifyOffline(): void {
    this.notifications.warning('Connection lost. Trying to reconnect.');
  }

  notifyOnline(): void {
    this.notifications.success('Connection restored.');
  }
}
