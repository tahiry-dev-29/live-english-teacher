import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoggingService } from '@core/services/logging.service';
import { NotificationService } from '@features/user-data/services/notification.service';
import { formatApiError, formatHttpError } from '@core/utils/api-error.util';
import { MESSAGES } from '@core/constants/messages';

/** Central HTTP UX boundary: normalize API/network errors and notify once. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);
  const logger = inject(LoggingService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const text = formatHttpError(error);
        logger.error(MESSAGES.log.streamFailed, {
          status: error.status,
          url: request.url,
          body: error.error,
        });
        notifications.error(text);
        return throwError(() => new Error(text));
      }

      const text = formatApiError(
        error instanceof Error ? error.message : String(error ?? ''),
      );
      logger.error(MESSAGES.log.streamFailed, error);
      notifications.error(text);
      return throwError(() => new Error(text));
    }),
  );
};
