import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import {
  NotificationType,
  ToastNotification,
} from '@core/models/notification.model';
import {
  LucideX,
  LucideInfo,
  LucideCheckCircle,
  LucideAlertTriangle,
  LucideAlertCircle,
} from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toast',
  standalone: true,
  imports: [
    LucideX,
    LucideInfo,
    LucideCheckCircle,
    LucideAlertTriangle,
    LucideAlertCircle,
  ],
  templateUrl: './toast.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .toast {
        animation: toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(-12px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class ToastComponent {
  readonly notifications = input.required<ToastNotification[]>();
  readonly dismiss = output<number>();

  protected alertClass(type: NotificationType): string {
    return 'alert alert-' + type;
  }
}
