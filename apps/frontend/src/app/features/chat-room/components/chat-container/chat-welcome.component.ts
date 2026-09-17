import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
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
      class="flex min-h-[60vh] w-auto flex-col items-center justify-center p-8 text-center opacity-70 select-none"
    >
      <div
        class="mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-base-200"
      >
        <svg lucideMessageSquare class="h-12 w-12 text-base-content/40"></svg>
      </div>
      <h3 class="mb-2 text-xl font-semibold text-base-content">
        {{ welcomeMessage().title }}
      </h3>
      <p class="max-w-xs text-base-content/60">
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
