import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GroupsApi } from '../../core/api/groups.api';
import { PlansApi } from '../../core/api/plans.api';
import { SessionService } from '../../core/auth/session.service';
import { daysFromToday } from '../../core/dates';
import { Icon, IconName } from '../../shared/icon';

interface Kpi {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  link: string;
  tone: 'primary' | 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  providers: [CurrencyPipe, DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export default class Home {
  protected readonly session = inject(SessionService);
  private readonly plansApi = inject(PlansApi);
  private readonly groupsApi = inject(GroupsApi);
  private readonly currency = inject(CurrencyPipe);
  private readonly number = inject(DecimalPipe);

  protected readonly data = rxResource({
    stream: () => forkJoin({ plans: this.plansApi.list(), groups: this.groupsApi.list() }),
  });

  protected readonly kpis = computed<Kpi[]>(() => {
    const data = this.data.value();
    if (!data) return [];
    const { plans, groups } = data;
    const active = plans.filter((p) => p.isActive);
    const expiringSoon = plans.filter((p) => {
      const days = daysFromToday(p.endDate);
      return days >= 0 && days <= 30;
    });
    const expired = plans.filter((p) => daysFromToday(p.endDate) < 0);
    const revenue = active.reduce((sum, p) => sum + p.amount, 0);
    const hectares = active.reduce((sum, p) => sum + p.quantityHectare, 0);

    return [
      {
        label: 'Planos ativos',
        value: `${active.length}/${plans.length}`,
        hint: `${this.number.transform(hectares, '1.0-0')} ha cobertos`,
        icon: 'users',
        link: '/painel/usuarios',
        tone: 'primary',
      },
      {
        label: 'Receita anual ativa',
        value: this.currency.transform(revenue, 'BRL', 'symbol', '1.0-0') ?? '',
        hint: 'Soma dos planos ativos',
        icon: 'sprout',
        link: '/painel/usuarios',
        tone: 'info',
      },
      {
        label: 'Vencem em 30 dias',
        value: String(expiringSoon.length),
        hint: 'Planos para renovar',
        icon: 'calendar',
        link: '/painel/planos-a-vencer',
        tone: 'warning',
      },
      {
        label: 'Planos vencidos',
        value: String(expired.length),
        hint: 'Aguardando renovação',
        icon: 'alert',
        link: '/painel/planos-a-vencer',
        tone: 'danger',
      },
      {
        label: 'Grupos de comparação',
        value: String(groups.length),
        hint: 'Safras em análise',
        icon: 'layers',
        link: '/painel/grupos',
        tone: 'primary',
      },
    ];
  });
}
