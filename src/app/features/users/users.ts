import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { apiErrorMessage } from '../../core/api/api-error';
import { PlansApi } from '../../core/api/plans.api';
import { formatApiDate } from '../../core/dates';
import { ContractedPlan, fullName } from '../../core/models';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';
import { Paginator, paginate } from '../../shared/paginator';
import { matches } from '../../shared/text';
import { ToastService } from '../../shared/toast';

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, Icon, Modal, Paginator],
  templateUrl: './users.html',
})
export default class Users {
  private readonly api = inject(PlansApi);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = 10;
  protected readonly fullName = fullName;
  protected readonly formatDate = formatApiDate;

  protected readonly plans = rxResource({ stream: () => this.api.list() });

  protected readonly search = signal('');
  protected readonly statusFilter = signal<'todos' | 'ativos' | 'inativos'>('todos');

  protected readonly filtered = computed(() => {
    const query = this.search();
    const status = this.statusFilter();
    return (this.plans.value() ?? [])
      .filter((p) => status === 'todos' || p.isActive === (status === 'ativos'))
      .filter((p) => !query || matches(`${fullName(p.producer)} ${p.email}`, query))
      .sort((a, b) => fullName(a.producer).localeCompare(fullName(b.producer), 'pt-BR'));
  });

  /** Volta para a página 1 sempre que o filtro muda. */
  protected readonly page = linkedSignal({
    source: () => [this.search(), this.statusFilter()],
    computation: () => 1,
  });
  protected readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));

  protected readonly confirming = signal<ContractedPlan | null>(null);
  protected readonly saving = signal(false);

  protected setConfirmOpen(open: boolean) {
    if (!open) this.confirming.set(null);
  }

  protected toggleActive() {
    const plan = this.confirming();
    if (!plan) return;
    const active = !plan.isActive;
    this.saving.set(true);
    this.api.setActive(plan.id, active).subscribe({
      next: (isActive) => {
        this.plans.value.update((list) =>
          list?.map((p) => (p.id === plan.id ? { ...p, isActive } : p)),
        );
        this.toast.show(`Plano de ${fullName(plan.producer)} ${isActive ? 'ativado' : 'desativado'}.`);
        this.confirming.set(null);
        this.saving.set(false);
      },
      error: (e) => {
        this.toast.error(apiErrorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
