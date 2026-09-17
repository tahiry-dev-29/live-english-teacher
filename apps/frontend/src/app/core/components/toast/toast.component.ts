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
      .toast {
        animation: toast-in 0.3s ease-out;
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .toast .alert button {
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .toast .alert:hover button {
        opacity: 1;
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
