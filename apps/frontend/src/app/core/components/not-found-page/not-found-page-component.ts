import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideHome } from '@lucide/angular';
import { SpaceIllustrationComponent } from '../space-illustration/space-illustration.component';
import { StarBackgroundComponent } from '../star-background/star-background.component';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, StarBackgroundComponent, SpaceIllustrationComponent, LucideHome],
  template: `
    <div
      class="min-h-screen bg-base-100 text-base-content flex flex-col items-center justify-center p-6 overflow-hidden relative"
    >
      <app-star-background></app-star-background>

      <app-space-illustration></app-space-illustration>

      <!-- Content -->
      <div class="relative z-10 text-center mt-8">
        <h1
          class="text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-warning bg-clip-text text-transparent mb-4"
        >
          404
        </h1>
        <p class="text-xl text-base-content/70 mb-2">Lost in Space</p>
        <p class="text-base-content/50 mb-8 max-w-md">
          The page you're looking for has drifted into another galaxy.
        </p>

        <a
          routerLink="/"
          class="btn btn-primary inline-flex items-center gap-2 px-6 shadow-lg shadow-primary/20 transition-transform hover:scale-105"
        >
          <svg lucideHome class="w-5 h-5"></svg>
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
