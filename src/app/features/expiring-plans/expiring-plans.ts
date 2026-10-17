import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-error';
import { PlansApi } from '../../core/api/plans.api';
import {
  daysFromToday,
  formatApiDate,
  fromIsoDate,
  relativeFromToday,
  toDate,
  toIsoDate,
} from '../../core/dates';
import { ContractedPlan, fullName } from '../../core/models';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';
import { Paginator, paginate } from '../../shared/paginator';
import { matches } from '../../shared/text';
import { ToastService } from '../../shared/toast';

type Tab = 'a-vencer' | 'vencidos';
type Urgency = 'critical' | 'soon' | 'ok' | 'expired';

interface PlanRow {
  plan: ContractedPlan;
  name: string;
  days: number;
  urgency: Urgency;
  dueLabel: string;
}

function urgencyOf(days: number): Urgency {
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'soon';
  return 'ok';
}

@Component({
  selector: 'app-expiring-plans',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, Paginator],
  templateUrl: './expiring-plans.html',
})
export default class ExpiringPlans {
  private readonly api = inject(PlansApi);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = 10;
  protected readonly formatDate = formatApiDate;

  protected readonly data = rxResource({
    stream: () => forkJoin({ toExpire: this.api.toExpire(), expired: this.api.expired() }),
  });

  protected readonly tab = signal<Tab>('a-vencer');
  protected readonly search = signal('');

  private readonly rows = computed(() => {
    const toRow = (plan: ContractedPlan): PlanRow => {
      const days = daysFromToday(plan.endDate);
      return {
        plan,
        name: fullName(plan.producer),
        days,
        urgency: urgencyOf(days),
        dueLabel: days < 0 ? `Venceu ${relativeFromToday(plan.endDate)}` : `Vence ${relativeFromToday(plan.endDate)}`,
      };
    };
    const data = this.data.value();
    return {
      // Mais urgentes primeiro / vencidos mais recentes primeiro.
      'a-vencer': (data?.toExpire ?? []).map(toRow).sort((a, b) => a.days - b.days),
      vencidos: (data?.expired ?? []).map(toRow).sort((a, b) => b.days - a.days),
    };
  });

  protected readonly counts = computed(() => ({
    'a-vencer': this.rows()['a-vencer'].length,
    vencidos: this.rows().vencidos.length,
    critical: this.rows()['a-vencer'].filter((r) => r.urgency === 'critical').length,
  }));

  protected readonly filtered = computed(() => {
    const query = this.search();
    return this.rows()[this.tab()].filter((r) => !query || matches(r.name, query));
  });

  protected readonly page = linkedSignal({
    source: () => [this.tab(), this.search()],
    computation: () => 1,
  });
  protected readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));

  // --- Edição do vencimento -------------------------------------------------
  protected readonly editing = signal<ContractedPlan | null>(null);
  protected readonly newEndDate = signal('');
  protected readonly saving = signal(false);

  protected readonly dateError = computed(() => {
    const plan = this.editing();
    if (!plan) return null;
    const date = fromIsoDate(this.newEndDate());
    if (!date) return 'Informe uma data válida.';
    if (toDate(date) <= toDate(plan.startDate)) {
      return `A data deve ser posterior ao início do plano (${formatApiDate(plan.startDate)}).`;
    }
    return null;
  });

  protected openEditor(plan: ContractedPlan) {
    this.editing.set(plan);
    this.newEndDate.set(toIsoDate(plan.endDate));
  }

  /** Atalho: renova por mais um ano a partir do vencimento atual. */
  protected extendOneYear() {
    const plan = this.editing();
    if (!plan) return;
    const [y, m, d] = plan.endDate;
    this.newEndDate.set(toIsoDate([y + 1, m, d]));
  }

  protected setEditorOpen(open: boolean) {
    if (!open) this.editing.set(null);
  }

  protected save() {
    const plan = this.editing();
    if (!plan || this.dateError()) return;
    this.saving.set(true);
    this.api.updateEndDate(plan.id, this.newEndDate()).subscribe({
      next: () => {
        this.toast.show(`Vencimento de ${fullName(plan.producer)} atualizado.`);
        this.editing.set(null);
        this.saving.set(false);
        this.data.reload();
      },
      error: (e) => {
        this.toast.error(apiErrorMessage(e, 'Erro ao alterar o vencimento.'));
        this.saving.set(false);
      },
    });
  }
}
