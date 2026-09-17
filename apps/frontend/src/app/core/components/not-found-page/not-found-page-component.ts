import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideHome } from '@lucide/angular';
import { SpaceIllustrationComponent } from '../space-illustration/space-illustration.component';
import { StarBackgroundComponent } from '../star-background/star-background.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-not-found-page',
  standalone: true,
  imports: [
    RouterLink,
    StarBackgroundComponent,
    SpaceIllustrationComponent,
    LucideHome,
  ],
  template: `
    <div
      class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base-100 p-6 text-base-content"
    >
      <app-star-background />

      <app-space-illustration />

      <!-- Content -->
      <div class="relative z-10 mt-8 text-center">
        <h1
          class="mb-4 bg-gradient-to-r from-primary via-secondary to-warning bg-clip-text text-8xl font-bold text-transparent"
        >
          404
        </h1>
        <p class="mb-2 text-xl text-base-content/70">Lost in Space</p>
        <p class="mb-8 max-w-md text-base-content/50">
          The page you're looking for has drifted into another galaxy.
        </p>

        <a
          routerLink="/"
          class="btn inline-flex items-center gap-2 px-6 shadow-lg shadow-primary/20 transition-transform btn-primary hover:scale-105"
        >
          <svg lucideHome class="h-5 w-5"></svg>
          Return Home
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes float {
        0%,
        100% {
          transform: translateY(0) rotate(-5deg);
        }
        50% {
          transform: translateY(-20px) rotate(5deg);
        }
      }
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
    `,
  ],
})
export class NotFoundPageComponent {}
