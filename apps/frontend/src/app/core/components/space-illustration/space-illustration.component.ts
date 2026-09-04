import { Component } from '@angular/core';
import { LucideRocket, LucideOrbit } from '@lucide/angular';
@Component({
  selector: 'app-space-illustration',
  standalone: true,
  imports: [LucideRocket, LucideOrbit],
  template: `<div class="relative z-10 animate-float">
      <svg lucideRocket class="w-[200px] h-[200px] text-primary drop-shadow-2xl"></svg>
    </div>
    <div class="absolute bottom-10 right-10 animate-spin-slow opacity-30">
      <svg lucideOrbit class="w-[120px] h-[120px] text-secondary"></svg>
    </div>`,
})
export class SpaceIllustrationComponent {}
