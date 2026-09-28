import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastComponent } from './toast.component';
import { ToastNotification } from '@core/models/notification.model';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let component: ToastComponent;

  const notifications: ToastNotification[] = [
    {
      id: 1,
      type: 'info',
      message: 'Information toast message',
      duration: 3000,
    },
    {
      id: 2,
      type: 'error',
      message: 'Critical error encountered',
      duration: 0,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('notifications', notifications);
    fixture.detectChanges();
  });

  it('renders all notifications with messages', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Information toast message');
    expect(text).toContain('Critical error encountered');
  });

  it('renders a type icon with path content in every toast', () => {
    fixture.detectChanges();
    const svgs: SVGElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(
        'svg[lucideInfo], svg[lucideCheckCircle], svg[lucideAlertTriangle], svg[lucideAlertCircle]',
      ),
    );
    expect(svgs.length).toBe(2);
    for (const svg of svgs) {
      expect(svg.childElementCount).toBeGreaterThan(0);
      // The icon inherits the alert content color: no text-* override
      // (tone-on-tone would make it invisible on the alert background).
      expect(svg.getAttribute('class')).not.toMatch(
        /text-(info|success|warning|error)/,
      );
    }
  });

  it('emits dismiss output when close button is clicked', () => {
    fixture.detectChanges();
    let dismissedId: number | null = null;
    component.dismiss.subscribe((id) => {
      dismissedId = id;
    });

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    button?.click();
    fixture.detectChanges();

    expect(dismissedId).toBe(1);
  });
});
