import { ChangeDetectionStrategy, Component, computed, effect, input, model } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (pageCount() > 1) {
      <nav class="paginator" aria-label="Paginação">
        <button
          type="button"
          class="paginator__btn"
          [disabled]="page() === 1"
          (click)="page.set(page() - 1)"
          aria-label="Página anterior"
        >
          <app-icon name="chevron-left" [size]="16" />
        </button>
        @for (p of pages(); track p) {
          <button
            type="button"
            class="paginator__btn"
            [class.is-active]="p === page()"
            [attr.aria-current]="p === page() ? 'page' : null"
            (click)="page.set(p)"
          >
            {{ p }}
          </button>
        }
        <button
          type="button"
          class="paginator__btn"
          [disabled]="page() === pageCount()"
          (click)="page.set(page() + 1)"
          aria-label="Próxima página"
        >
          <app-icon name="chevron-right" [size]="16" />
        </button>
        <span class="paginator__info">{{ total() }} registros</span>
      </nav>
    }
  `,
})
export class Paginator {
  readonly total = input.required<number>();
  readonly pageSize = input(10);
  readonly maxButtons = input(5);
  readonly page = model(1);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  protected readonly pages = computed(() => {
    const count = this.pageCount();
    const size = Math.min(this.maxButtons(), count);
    const start = Math.min(Math.max(1, this.page() - Math.floor(size / 2)), count - size + 1);
    return Array.from({ length: size }, (_, i) => start + i);
  });

  constructor() {
    // Mantém a página válida quando a lista encolhe (ex.: filtro aplicado).
    effect(() => {
      if (this.page() > this.pageCount()) this.page.set(this.pageCount());
    });
  }
}

/** Fatia uma lista para a página atual. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
