import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon } from './icon';
import { matches } from './text';

let nextId = 0;

/** Campo de busca com lista de sugestões navegável pelo teclado (substitui o typeahead do ngx-bootstrap). */
@Component({
  selector: 'app-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="autocomplete" [class.is-open]="isOpen()">
      <app-icon name="search" class="autocomplete__icon" [size]="16" />
      <input
        type="text"
        class="input"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="isOpen() ? listId + '-' + active() : null"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [value]="query()"
        (input)="onInput($event)"
        (focus)="open.set(true)"
        (blur)="open.set(false)"
        (keydown)="onKeydown($event)"
      />
      @if (isOpen()) {
        <ul class="autocomplete__list" role="listbox" [id]="listId">
          @for (item of filtered(); track $index; let i = $index) {
            <li
              role="option"
              [id]="listId + '-' + i"
              [class.is-active]="i === active()"
              [attr.aria-selected]="i === active()"
              (mousedown)="$event.preventDefault(); choose(item)"
              (mouseenter)="active.set(i)"
            >
              {{ label()(item) }}
            </li>
          } @empty {
            <li class="autocomplete__empty">{{ emptyText() }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class Autocomplete<T> {
  readonly items = input.required<readonly T[]>();
  readonly label = input.required<(item: T) => string>();
  readonly placeholder = input('');
  readonly emptyText = input('Nenhum resultado');
  readonly disabled = input(false);
  readonly selected = output<T>();

  protected readonly listId = `autocomplete-${nextId++}`;
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(0);

  protected readonly filtered = computed(() => {
    const q = this.query();
    const label = this.label();
    return this.items()
      .filter((item) => matches(label(item), q))
      .slice(0, 50);
  });
  protected readonly isOpen = computed(() => this.open() && !this.disabled());

  protected onInput(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
    this.active.set(0);
    this.open.set(true);
  }

  protected onKeydown(event: KeyboardEvent) {
    const count = this.filtered().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        this.active.update((i) => (count ? (i + 1) % count : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.active.update((i) => (count ? (i - 1 + count) % count : 0));
        break;
      case 'Enter': {
        const item = this.filtered()[this.active()];
        if (this.isOpen() && item !== undefined) {
          event.preventDefault();
          this.choose(item);
        }
        break;
      }
      case 'Escape':
        this.open.set(false);
        break;
    }
  }

  protected choose(item: T) {
    this.selected.emit(item);
    this.query.set('');
    this.active.set(0);
    this.open.set(false);
  }
}
