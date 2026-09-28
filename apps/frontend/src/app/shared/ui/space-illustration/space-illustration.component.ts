import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LucideRocket, LucideOrbit } from '@lucide/angular';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-space-illustration',
  standalone: true,
  imports: [LucideRocket, LucideOrbit],
  template: `<div class="animate-float relative z-10">
      <svg
        lucideRocket
        class="h-[200px] w-[200px] text-primary drop-shadow-2xl"
      ></svg>
    </div>
    <div class="animate-spin-slow absolute right-10 bottom-10 opacity-30">
      <svg lucideOrbit class="h-[120px] w-[120px] text-secondary"></svg>
    </div>`,
})
export class SpaceIllustrationComponent {}
