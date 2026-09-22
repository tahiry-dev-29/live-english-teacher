/**
 * Centralized internal logging: console + devtools with security filtering.
 * All frontend call-sites must go through this service (Task 32).
 * Secrets (key/token/password) are masked in context objects.
 *
 * `appLogger` is the context-free variant for services/tests that may be
 * constructed outside the Angular injector (`new SomeService()`).
 */
import { Injectable } from '@angular/core';

type LogContext = unknown;

const SECRET_KEYS = /password|token|api[_-]?key|secret/i;
const PREFIX = '[live-teacher]';

export function sanitizeContext(context: LogContext): LogContext {
  if (context === null || typeof context !== 'object') return context;
  if (context instanceof Error) return context;
  if (Array.isArray(context))
    return context.map((item) => sanitizeContext(item));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = SECRET_KEYS.test(key) ? '***' : sanitizeContext(value);
  }
  return out;
}

function args(context: LogContext): LogContext[] {
  return context === undefined ? [] : [sanitizeContext(context)];
}

/** Context-free logger — safe without an Angular injection context. */
export const appLogger = {
  error(message: string, context?: LogContext): void {
    console.error(PREFIX, message, ...args(context));
  },
  warn(message: string, context?: LogContext): void {
    console.warn(PREFIX, message, ...args(context));
  },
  info(message: string, context?: LogContext): void {
    console.info(PREFIX, message, ...args(context));
  },
};

@Injectable({ providedIn: 'root' })
export class LoggingService {
  error(message: string, context?: LogContext): void {
    appLogger.error(message, context);
  }

  warn(message: string, context?: LogContext): void {
    appLogger.warn(message, context);
  }

  info(message: string, context?: LogContext): void {
    appLogger.info(message, context);
  }
}
