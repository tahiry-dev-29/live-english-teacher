import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { Session } from '@models/session.model';
import { AppDropdownMenuComponent } from '@app-shared/ui/dropdown-menu/dropdown-menu.component';
import {
  LucideCheck,
  LucidePencil,
  LucidePin,
  LucidePinOff,
  LucideShare2,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { highlightSessionTitle } from './session-filter.util';

/** Single session row: title button, inline rename editor, action menu. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-session-list-item',
  standalone: true,
  imports: [
    AppDropdownMenuComponent,
    LucideCheck,
    LucidePencil,
    LucidePin,
    LucidePinOff,
    LucideShare2,
    LucideTrash2,
    LucideX,
  ],
  template: `
    @if (editing()) {
      <div class="flex w-full min-w-0 items-center gap-1 px-1 py-1">
        <input
          #editInput
          type="text"
          [value]="draft()"
          (input)="draftChange.emit(editInput.value)"
          (keyup.enter)="
            saveRename.emit({ id: session().id, title: editInput.value })
          "
          (keyup.escape)="cancelRename.emit()"
          class="input min-w-0 flex-1 border-base-300 bg-base-100 input-xs"
          placeholder="Session title"
        />
        <button
          type="button"
          (click)="saveRename.emit({ id: session().id, title: draft() })"
          class="btn shrink-0 btn-ghost text-success btn-xs"
          aria-label="Save"
        >
          <svg lucideCheck class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          (click)="cancelRename.emit()"
          class="btn shrink-0 btn-ghost btn-xs"
          aria-label="Cancel"
        >
          <svg lucideX class="h-3.5 w-3.5" />
        </button>
      </div>
    } @else {
      <div
        class="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors duration-150 select-none group-hover:bg-base-100"
        [class.bg-base-300]="isActive()"
        [class.font-medium]="isActive()"
      >
        <button
          type="button"
          (click)="selected.emit(session().id)"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 pr-1 text-left outline-none"
        >
          <span
            class="block truncate text-xs leading-5 font-normal"
            [innerHTML]="highlighted()"
          ></span>
        </button>
        <div
          class="pointer-events-none flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
        >
          <app-dropdown-menu
            triggerLabel="Chat options"
            (click)="$event.stopPropagation()"
          >
            <li>
              <button
                type="button"
                (click)="share.emit(session())"
                class="flex items-center gap-2 rounded-xl py-1.5 text-xs text-base-content"
              >
                <svg
                  lucideShare2
                  class="h-3.5 w-3.5 text-base-content/70"
                /><span>Share conversation</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                (click)="pinToggled.emit(session().id)"
                class="flex items-center gap-2 rounded-xl py-1.5 text-xs text-base-content"
              >
                @if (session().isPinned) {
                  <svg
                    lucidePinOff
                    class="h-3.5 w-3.5 text-base-content/70"
                  /><span>Unpin</span>
                } @else {
                  <svg
                    lucidePin
                    class="h-3.5 w-3.5 text-base-content/70"
                  /><span>Pin</span>
                }
              </button>
            </li>
            <li>
              <button
                type="button"
                (click)="renameRequested.emit(session())"
                class="flex items-center gap-2 rounded-xl py-1.5 text-xs text-base-content"
              >
                <svg
                  lucidePencil
                  class="h-3.5 w-3.5 text-base-content/70"
                /><span>Rename</span>
              </button>
            </li>
            <li class="mt-1 border-t border-base-300/60 pt-1">
              <button
                type="button"
                (click)="deleteRequested.emit(session())"
                class="flex items-center gap-2 rounded-xl py-1.5 text-xs text-error hover:bg-error/10"
              >
                <svg lucideTrash2 class="h-3.5 w-3.5" /><span>Delete</span>
              </button>
            </li>
          </app-dropdown-menu>
        </div>
      </div>
    }
  `,
})
export class SessionListItemComponent {
  readonly session = input.required<Session>();
  readonly isActive = input<boolean>(false);
  readonly editing = input<boolean>(false);
  readonly draft = input<string>('');
  readonly highlightTerm = input<string>('');
  readonly draftChange = output<string>();
  readonly selected = output<string>();
  readonly share = output<Session>();
  readonly pinToggled = output<string>();
  readonly renameRequested = output<Session>();
  readonly saveRename = output<{ id: string; title: string }>();
  readonly cancelRename = output<void>();
  readonly deleteRequested = output<Session>();
  protected readonly highlighted = computed<string>(() =>
    highlightSessionTitle(this.session().title, this.highlightTerm()),
  );
}
