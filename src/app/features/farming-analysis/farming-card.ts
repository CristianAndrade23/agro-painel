import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { CostBreakdown, CostDetail, Farming } from '../../core/models';
import { Icon } from '../../shared/icon';

type Scenario = 'estimated' | 'effective';

const COST_GROUPS: { key: keyof CostBreakdown; label: string }[] = [
  { key: 'directCost', label: 'Custos diretos' },
  { key: 'indirectCost', label: 'Custos indiretos' },
  { key: 'administrativeCost', label: 'Custos administrativos' },
];

function sum(items: CostDetail[], field: 'valueCost' | 'costPerHectare' | 'costPerBags') {
  return items.reduce((total, item) => total + item[field], 0);
}

/** Cartão de uma lavoura com seleção e detalhamento de custos estimados x efetivos. */
@Component({
  selector: 'app-farming-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, Icon],
  templateUrl: './farming-card.html',
  styleUrl: './farming-card.css',
})
export class FarmingCard {
  readonly farming = input.required<Farming>();
  readonly selectable = input(true);
  readonly selected = model(false);

  protected readonly expanded = signal(false);
  protected readonly scenario = signal<Scenario>('estimated');

  protected readonly figures = computed(() => {
    const f = this.farming();
    const estimated = this.scenario() === 'estimated';
    return {
      production: estimated ? f.estimatedProductionQuantity : f.effectiveProductionQuantity,
      productivity: estimated ? f.estimatedProductivity : f.effectiveProductivity,
      salePrice: estimated ? f.estimatedSalePrice : f.effectiveSalePrice,
      costs: estimated ? f.estimatedCost : f.effectiveCost,
    };
  });

  protected readonly costGroups = computed(() => {
    const costs = this.figures().costs;
    return COST_GROUPS.map(({ key, label }) => ({
      label,
      items: costs[key],
      total: sum(costs[key], 'valueCost'),
      perHectare: sum(costs[key], 'costPerHectare'),
      perBag: sum(costs[key], 'costPerBags'),
    }));
  });

  protected readonly totals = computed(() => {
    const groups = this.costGroups();
    const total = groups.reduce((s, g) => s + g.total, 0);
    const revenue = this.figures().production * this.figures().salePrice;
    return {
      total,
      perHectare: groups.reduce((s, g) => s + g.perHectare, 0),
      perBag: groups.reduce((s, g) => s + g.perBag, 0),
      revenue,
      margin: revenue - total,
    };
  });
}
