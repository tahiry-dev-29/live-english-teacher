import { Component } from '@angular/core';

@Component({
  selector: 'app-star-background',
  standalone: true,
  template: `
    <div class="absolute inset-0 overflow-hidden">
      @for (i of stars; track i) {
      <div
        class="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
        [style.left.%]="i.x"
        [style.top.%]="i.y"
        [style.animation-delay.s]="i.delay"
      ></div>
      }
    </div>
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
  stars = Array.from({ length: 50 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
  }));
}
