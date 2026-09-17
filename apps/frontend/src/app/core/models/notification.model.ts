export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
  timestamp: number;
}
