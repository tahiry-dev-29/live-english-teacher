import { Component, output } from '@angular/core';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  template: `
    <div class="flex items-center gap-3 group">
      <!-- Avatar with gradient -->
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-gray-700 group-hover:ring-purple-500/50 transition-all">
        G
      </div>
      
      <!-- User Info -->
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-white truncate">Guest User</div>
        <div class="text-xs text-gray-500">Free Plan</div>
      </div>
      
      <!-- Menu Button -->
      <button 
        (click)="openSettings.emit()"
        class="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all group/btn cursor-pointer"
        title="Settings">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      </button>
    </div>
  `
})
export class UserMenuComponent {
  openSettings = output<void>();
}
