import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { apiErrorMessage } from '../../core/api/api-error';
import { FarmingApi } from '../../core/api/farming.api';
import { GroupsApi } from '../../core/api/groups.api';
import { Group, cultureIdByName, fullName } from '../../core/models';
import { Autocomplete } from '../../shared/autocomplete';
import { Icon } from '../../shared/icon';
import { ToastService } from '../../shared/toast';

interface Candidate {
  id: number;
  label: string;
}

/** Vincula/desvincula lavouras aptas (mesma cultura e safra) a um grupo de comparação. */
@Component({
  selector: 'app-group-farmings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Autocomplete, Icon],
  template: `
    <div class="stack">
      <p class="text-muted">
        Somente lavouras <strong>aptas</strong> de {{ group().cultureType }}, safra
        {{ group().plantingYear }}/{{ group().harvestYear }}, podem ser vinculadas.
      </p>

      <label class="field">
        <span class="field__label">Adicionar lavoura</span>
        <app-autocomplete
          [items]="candidates()"
          [label]="candidateLabel"
          [disabled]="busy() || !available.hasValue()"
          placeholder="Busque por produtor ou lavoura…"
          emptyText="Nenhuma lavoura apta disponível"
          (selected)="add($event)"
        />
      </label>

      @if (linked.hasValue()) {
        <div>
          <span class="field__label">Lavouras no grupo ({{ linked.value().length }})</span>
          <div class="chips">
            @for (f of linked.value(); track f.id) {
              <span class="chip">
                <span class="chip__label">{{ fullName(f.producer) }} — {{ f.name }}</span>
                <button
                  type="button"
                  class="chip__remove"
                  [disabled]="busy()"
                  [attr.aria-label]="'Desvincular ' + f.name"
                  (click)="remove(f.id)"
                >
                  <app-icon name="x" [size]="14" />
                </button>
              </span>
            } @empty {
              <p class="text-muted">Nenhuma lavoura vinculada ainda.</p>
            }
          </div>
        </div>
      } @else {
        <p class="text-muted">Carregando lavouras…</p>
      }
    </div>
  `,
})
export class GroupFarmings {
  private readonly groupsApi = inject(GroupsApi);
  private readonly farmingApi = inject(FarmingApi);
  private readonly toast = inject(ToastService);

  readonly group = input.required<Group>();

  protected readonly fullName = fullName;
  protected readonly candidateLabel = (c: Candidate) => c.label;
  protected readonly busy = signal(false);

  protected readonly linked = rxResource({
    params: () => this.group().id,
    stream: ({ params: id }) => this.groupsApi.farmings(id),
  });

  protected readonly available = rxResource({
    params: () => this.group(),
    stream: ({ params: g }) =>
      this.farmingApi.ableForCrop(cultureIdByName(g.cultureType) ?? 0, g.plantingYear, g.harvestYear),
  });

  protected readonly candidates = computed<Candidate[]>(() => {
    const inGroup = new Set((this.linked.value() ?? []).map((f) => f.id));
    return (this.available.value() ?? []).flatMap((pf) =>
      pf.ableFarmings
        .filter((f) => !inGroup.has(f.id))
        .map((f) => ({ id: f.id, label: `${fullName(pf.producer)} — ${f.name}` })),
    );
  });

  protected add(candidate: Candidate) {
    this.busy.set(true);
    this.groupsApi.addFarming(this.group().id, candidate.id).subscribe({
      next: () => this.done(),
      error: (e) => this.fail(e),
    });
  }

  protected remove(farmingId: number) {
    this.busy.set(true);
    this.groupsApi.removeFarming(this.group().id, farmingId).subscribe({
      next: () => this.done(),
      error: (e) => this.fail(e),
    });
  }

  private done() {
    this.busy.set(false);
    this.linked.reload();
  }

  private fail(error: unknown) {
    this.busy.set(false);
    this.toast.error(apiErrorMessage(error));
  }
}
