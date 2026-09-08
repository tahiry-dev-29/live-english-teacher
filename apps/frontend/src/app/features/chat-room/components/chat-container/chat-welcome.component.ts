import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideMessageSquare } from '@lucide/angular';
import { WELCOME_MESSAGES } from './chat-welcome.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-welcome',
  standalone: true,
  imports: [CommonModule, LucideMessageSquare],
  template: `
    <div
      class="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 w-auto opacity-70 select-none"
    >
      <div
        class="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mb-6 animate-pulse"
      >
        <svg lucideMessageSquare class="w-12 h-12 text-base-content/40"></svg>
      </div>
      <h3 class="text-xl font-semibold text-base-content mb-2">
        {{ welcomeMessage().title }}
      </h3>
      <p class="text-base-content/60 max-w-xs">
        {{ welcomeMessage().subtitle }}
      </p>
    </div>
  `,
})
export class ChatWelcomeComponent {
  learningLanguage = input('en');

  welcomeMessage = computed(() => {
    const lang = this.learningLanguage().toLowerCase();
    const shortLang = lang.split('-')[0];
    return WELCOME_MESSAGES[shortLang] || WELCOME_MESSAGES['en'];
  });
}
