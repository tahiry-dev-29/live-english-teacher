import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-star-background',
  standalone: true,
  imports: [],
  template: `
    @if (themeService.resolvedTheme() === 'app-dark') {
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        @for (i of stars; track i) {
          <div
            class="animate-twinkle absolute h-1 w-1 rounded-full bg-base-content/70"
            [style.left.%]="i.x"
            [style.top.%]="i.y"
            [style.animation-delay.s]="i.delay"
          ></div>
        }
      </div>
    }
  `,
  styles: [
    `
      @keyframes twinkle {
        0%,
        100% {
          opacity: 0.3;
        }
        50% {
          opacity: 1;
        }
      }
      .animate-twinkle {
        animation: twinkle 2s ease-in-out infinite;
      }
    `,
  ],
})
export class StarBackgroundComponent {
  readonly themeService = inject(ThemeService);

  readonly stars = Array.from({ length: 50 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
  }));
}
