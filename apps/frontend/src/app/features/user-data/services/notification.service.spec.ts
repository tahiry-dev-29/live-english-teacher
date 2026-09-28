import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new NotificationService();
  });

  it('pushes notification with correct type and message', () => {
    service.info('Information message');
    const notifications = service.notifications();

    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('info');
    expect(notifications[0].message).toBe('Information message');
  });

  it('pushes success, warning, and error notifications', () => {
    service.success('Success message');
    service.warning('Warning message');
    service.error('Error message');

    const notifications = service.notifications();
    expect(notifications.length).toBe(3);
    expect(notifications[0].type).toBe('success');
    expect(notifications[1].type).toBe('warning');
    expect(notifications[2].type).toBe('error');
  });

  it('auto-dismisses notification after duration', () => {
    service.info('Auto dismiss me', 3000);
    expect(service.notifications().length).toBe(1);

    vi.advanceTimersByTime(3000);
    expect(service.notifications().length).toBe(0);
  });

  it('allows manual dismiss of specific notification', () => {
    service.info('First');
    service.info('Second');
    const [first, second] = service.notifications();

    service.dismiss(first.id);
    const remaining = service.notifications();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(second.id);
  });

  it('clears all notifications and timers', () => {
    service.info('First');
    service.info('Second');
    expect(service.notifications().length).toBe(2);

    service.clear();
    expect(service.notifications().length).toBe(0);
  });
});
