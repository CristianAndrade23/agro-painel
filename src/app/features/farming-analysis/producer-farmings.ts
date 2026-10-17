import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { apiErrorMessage } from '../../core/api/api-error';
import { FarmingApi } from '../../core/api/farming.api';
import { Farming, ProducerFarmings, fullName } from '../../core/models';
import { Icon } from '../../shared/icon';
import { ToastService } from '../../shared/toast';
import { FarmingCard } from './farming-card';

type ListKey = 'able' | 'unable';

/** Lavouras de um produtor, com seleção em lote para habilitar/desabilitar a comparação. */
@Component({
  selector: 'app-producer-farmings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FarmingCard, Icon],
  template: `
    @let d = data();
    <section class="card panel">
      <header class="panel__header">
        <div>
          <h2>{{ name() }}</h2>
          <span class="text-muted">
            {{ d.ableFarmings.length + d.unableFarmings.length }} lavouras cadastradas
          </span>
        </div>
      </header>

      @for (list of lists(); track list.key) {
        <div class="panel__list" [attr.data-cy]="'list-' + list.key">
          <div class="panel__list-header">
            <h3>
              Lavouras
              <span [class]="list.key === 'able' ? 'text-success' : 'text-danger'">{{ list.title }}</span>
              <span class="tabs__count">{{ list.items.length }}</span>
            </h3>
            <button
              type="button"
              class="btn btn--sm"
              [class.btn--primary]="list.key === 'unable'"
              [class.btn--danger]="list.key === 'able'"
              [disabled]="list.selectedCount === 0 || saving()"
              (click)="apply(list.key)"
            >
              <app-icon [name]="list.key === 'unable' ? 'arrow-up' : 'arrow-down'" [size]="16" />
              {{ list.action }}
              @if (list.selectedCount) {
                ({{ list.selectedCount }})
              }
            </button>
          </div>

          <div class="stack stack--sm">
            @for (farming of list.items; track farming.id) {
              <app-farming-card
                [farming]="farming"
                [selected]="selection()[list.key].has(farming.id)"
                (selectedChange)="toggle(list.key, farming.id, $event)"
              />
            } @empty {
              <p class="text-muted">{{ list.empty }}</p>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .panel {
      padding: 20px;
      display: grid;
      gap: 24px;
    }
    .panel__header h2 {
      margin: 0;
      font-size: 18px;
    }
    .panel__list {
      display: grid;
      gap: 12px;
    }
    .panel__list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .panel__list-header h3 {
      margin: 0;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `,
})
export class ProducerFarmingsPanel {
  private readonly api = inject(FarmingApi);
  private readonly toast = inject(ToastService);

  readonly data = input.required<ProducerFarmings>();
  readonly changed = output<void>();

  protected readonly saving = signal(false);
  protected readonly name = computed(() => fullName(this.data().producer));

  /** Seleção zera sempre que os dados do produtor são recarregados. */
  protected readonly selection = linkedSignal({
    source: this.data,
    computation: () => ({ able: new Set<number>(), unable: new Set<number>() }),
  });

  protected readonly lists = computed(() => {
    const d = this.data();
    const sel = this.selection();
    return [
      {
        key: 'able' as const,
        title: 'aptas',
        action: 'Desabilitar',
        empty: 'Nenhuma lavoura apta para comparação.',
        items: d.ableFarmings,
        selectedCount: sel.able.size,
      },
      {
        key: 'unable' as const,
        title: 'não aptas',
        action: 'Habilitar',
        empty: 'Nenhuma lavoura pendente.',
        items: d.unableFarmings,
        selectedCount: sel.unable.size,
      },
    ];
  });

  protected toggle(list: ListKey, id: number, checked: boolean) {
    this.selection.update((sel) => {
      const next = new Set(sel[list]);
      if (checked) next.add(id);
      else next.delete(id);
      return { ...sel, [list]: next };
    });
  }

  protected apply(list: ListKey) {
    const ids = [...this.selection()[list]];
    const enabling = list === 'unable';
    const source: Farming[] = enabling ? this.data().unableFarmings : this.data().ableFarmings;
    const names = source.filter((f) => ids.includes(f.id)).map((f) => f.name);

    this.saving.set(true);
    this.api.setAbleToCompare(ids, enabling).subscribe({
      next: () => {
        const subject = names.length === 1 ? `"${names[0]}"` : `${names.length} lavouras`;
        this.toast.show(
          enabling
            ? `${subject} ${names.length === 1 ? 'agora está apta' : 'agora estão aptas'} para comparação.`
            : `${subject} ${names.length === 1 ? 'não está mais apta' : 'não estão mais aptas'} para comparação.`,
          enabling ? 'success' : 'info',
        );
        this.saving.set(false);
        this.changed.emit();
      },
      error: (e) => {
        this.toast.error(apiErrorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
