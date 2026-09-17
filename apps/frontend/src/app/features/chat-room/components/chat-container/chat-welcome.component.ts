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
    <div class="hero min-h-[60vh]">
      <div class="hero-content text-center">
        <div class="max-w-md opacity-70 select-none">
          <div class="avatar mb-6 avatar-placeholder">
            <div
              class="w-24 animate-pulse rounded-full bg-base-200 text-base-content/40"
            >
              <svg lucideMessageSquare class="h-12 w-12"></svg>
            </div>
          </div>
          <h3 class="mb-2 text-xl font-semibold text-base-content">
            {{ welcomeMessage().title }}
          </h3>
          <p class="mx-auto max-w-xs text-base-content/60">
            {{ welcomeMessage().subtitle }}
          </p>
        </div>
      </div>
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
