import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      
      <!-- Stars Background -->
      <div class="absolute inset-0 overflow-hidden">
        @for (i of stars; track i) {
          <div 
            class="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            [style.left.%]="i.x"
            [style.top.%]="i.y"
            [style.animation-delay.s]="i.delay">
          </div>
        }
      </div>

      <!-- Animated SVG Astronaut -->
      <div class="relative z-10 animate-float">
        <svg width="200" height="200" viewBox="0 0 200 200" class="drop-shadow-2xl">
          <!-- Helmet -->
          <ellipse cx="100" cy="70" rx="45" ry="50" fill="#374151" stroke="#4B5563" stroke-width="3"/>
          <ellipse cx="100" cy="70" rx="35" ry="40" fill="#1F2937"/>
          <!-- Visor reflection -->
          <ellipse cx="90" cy="60" rx="15" ry="20" fill="#3B82F6" opacity="0.3"/>
          
          <!-- Body -->
          <rect x="60" y="115" width="80" height="50" rx="15" fill="#374151" stroke="#4B5563" stroke-width="2"/>
          
          <!-- Backpack -->
          <rect x="130" y="120" width="20" height="40" rx="5" fill="#4B5563"/>
          
          <!-- Arms -->
          <g class="animate-wave origin-center" style="transform-origin: 60px 130px;">
            <rect x="25" y="125" width="40" height="15" rx="7" fill="#374151" stroke="#4B5563" stroke-width="2"/>
            <circle cx="25" cy="132" r="10" fill="#374151" stroke="#4B5563" stroke-width="2"/>
          </g>
          <rect x="135" y="125" width="40" height="15" rx="7" fill="#374151" stroke="#4B5563" stroke-width="2"/>
          <circle cx="175" cy="132" r="10" fill="#374151" stroke="#4B5563" stroke-width="2"/>
          
          <!-- Legs -->
          <rect x="70" y="160" width="20" height="35" rx="8" fill="#374151" stroke="#4B5563" stroke-width="2"/>
          <rect x="110" y="160" width="20" height="35" rx="8" fill="#374151" stroke="#4B5563" stroke-width="2"/>
          
          <!-- Boots -->
          <ellipse cx="80" cy="195" rx="12" ry="8" fill="#1F2937"/>
          <ellipse cx="120" cy="195" rx="12" ry="8" fill="#1F2937"/>
        </svg>
      </div>

      <!-- Planet -->
      <div class="absolute bottom-10 right-10 animate-spin-slow opacity-30">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="#7C3AED"/>
          <ellipse cx="60" cy="60" rx="70" ry="15" fill="none" stroke="#A78BFA" stroke-width="4" transform="rotate(-20 60 60)"/>
        </svg>
      </div>

      <!-- Content -->
      <div class="relative z-10 text-center mt-8">
        <h1 class="text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <p class="text-xl text-gray-400 mb-2">Lost in Space</p>
        <p class="text-gray-500 mb-8 max-w-md">
          The page you're looking for has drifted into another galaxy.
        </p>
        
        <a 
          routerLink="/"
          class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Return Home
        </a>
      </div>
    </div>
  `,
  styles: [`
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(-5deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
    
    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-20deg); }
    }
    
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    
    .animate-wave {
      animation: wave 2s ease-in-out infinite;
    }
    
    .animate-twinkle {
      animation: twinkle 2s ease-in-out infinite;
    }
    
    .animate-spin-slow {
      animation: spin-slow 30s linear infinite;
    }
  `]
})
export class NotFoundPageComponent {
  stars = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2
  }));
}
