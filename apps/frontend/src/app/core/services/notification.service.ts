import { Injectable, signal, OnDestroy } from '@angular/core';
import {
  ToastNotification,
  NotificationType,
} from '@core/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly notificationsSignal = signal<ToastNotification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Durée d'affichage en ms — 0 = aucun auto-dismiss */
  private readonly defaultDuration = 4000;

  info(message: string, duration = this.defaultDuration): void {
    this.push({ type: 'info', message, duration });
  }

  success(message: string, duration = this.defaultDuration): void {
    this.push({ type: 'success', message, duration });
  }

  warning(message: string, duration = this.defaultDuration): void {
    this.push({ type: 'warning', message, duration });
  }

  error(message: string, duration = this.defaultDuration): void {
    this.push({ type: 'error', message, duration });
  }

  dismiss(id: number): void {
    this.remove(id);
  }

  clear(): void {
    for (const [id] of this.timers) {
      this.remove(id);
    }
  }

  private push({
    type,
    message,
    duration,
  }: {
    type: NotificationType;
    message: string;
    duration: number;
  }): void {
    const id = this.nextId++;
    const entry: ToastNotification = {
      id,
      type,
      message,
      timestamp: Date.now(),
    };
    this.notificationsSignal.update((list) => [...list, entry]);

    if (duration > 0) {
      const timer = setTimeout(() => this.remove(id), duration);
      this.timers.set(id, timer);
    }
  }

  private remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.notificationsSignal.update((list) => list.filter((n) => n.id !== id));
  }

  ngOnDestroy(): void {
    this.clear();
  }
}
