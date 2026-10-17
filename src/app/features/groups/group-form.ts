import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CULTURE_TYPES, Group, GroupRequest, cultureIdByName } from '../../core/models';
import { Icon } from '../../shared/icon';

const YEAR = /^\d{4}$/;

/**
 * Formulário de criação/edição de grupo. A validação é toda derivada com computed():
 * cada campo é um signal e os erros são recalculados automaticamente a cada alteração.
 */
@Component({
  selector: 'app-group-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <form class="form-grid" id="group-form" (submit)="submit($event)" novalidate>
      <label class="field">
        <span class="field__label">Nome do grupo</span>
        <input
          class="input"
          maxlength="20"
          autocomplete="off"
          placeholder="Ex.: SOJA-2425"
          [class.is-invalid]="show('name') && errors().name"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
          (blur)="touch('name')"
        />
        @if (show('name') && errors().name; as error) {
          <span class="field__error">{{ error }}</span>
        } @else {
          <span class="field__hint">Sem espaços, até 20 caracteres.</span>
        }
      </label>

      <label class="field">
        <span class="field__label">Cultura</span>
        <select
          class="input"
          [disabled]="locked()"
          [class.is-invalid]="show('culture') && errors().culture"
          [value]="culture()"
          (change)="culture.set($any($event.target).value)"
          (blur)="touch('culture')"
        >
          <option value="" disabled>Selecione…</option>
          @for (c of cultures; track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        @if (show('culture') && errors().culture; as error) {
          <span class="field__error">{{ error }}</span>
        }
      </label>

      <label class="field">
        <span class="field__label">Ano de plantio</span>
        <input
          class="input"
          inputmode="numeric"
          maxlength="4"
          placeholder="aaaa"
          [disabled]="locked()"
          [class.is-invalid]="show('plantingYear') && errors().plantingYear"
          [value]="plantingYear()"
          (input)="plantingYear.set(digits($event))"
          (blur)="touch('plantingYear')"
        />
        @if (show('plantingYear') && errors().plantingYear; as error) {
          <span class="field__error">{{ error }}</span>
        }
      </label>

      <label class="field">
        <span class="field__label">Ano de colheita</span>
        <input
          class="input"
          inputmode="numeric"
          maxlength="4"
          placeholder="aaaa"
          [disabled]="locked()"
          [class.is-invalid]="show('harvestYear') && errors().harvestYear"
          [value]="harvestYear()"
          (input)="harvestYear.set(digits($event))"
          (blur)="touch('harvestYear')"
        />
        @if (show('harvestYear') && errors().harvestYear; as error) {
          <span class="field__error">{{ error }}</span>
        }
      </label>

      @if (locked()) {
        <div class="alert alert--warning form-grid__full">
          <app-icon name="alert" />
          Este grupo já possui lavouras vinculadas, por isso apenas o nome pode ser alterado.
        </div>
      }
      @if (serverError(); as error) {
        <div class="alert alert--danger form-grid__full">
          <app-icon name="alert" />
          {{ error }}
        </div>
      }
      <!-- permite enviar com Enter -->
      <button type="submit" hidden></button>
    </form>
  `,
})
export class GroupForm {
  /** Grupo em edição; ausente = criação. */
  readonly group = input<Group | null>(null);
  readonly existingNames = input<string[]>([]);
  readonly locked = input(false);
  readonly serverError = input<string | null>(null);
  readonly submitted = output<GroupRequest>();

  protected readonly cultures = CULTURE_TYPES;

  protected readonly name = signal('');
  protected readonly culture = signal('');
  protected readonly plantingYear = signal('');
  protected readonly harvestYear = signal('');
  private readonly touched = signal<ReadonlySet<string>>(new Set());

  ngOnInit() {
    const g = this.group();
    if (!g) return;
    this.name.set(g.name);
    this.culture.set(String(cultureIdByName(g.cultureType) ?? ''));
    this.plantingYear.set(String(g.plantingYear));
    this.harvestYear.set(String(g.harvestYear));
  }

  protected readonly errors = computed(() => {
    const name = this.name().trim();
    const planting = this.plantingYear();
    const harvest = this.harvestYear();
    const taken = this.existingNames()
      .filter((n) => n !== this.group()?.name)
      .some((n) => n.toLowerCase() === name.toLowerCase());

    return {
      name: !name
        ? 'Informe o nome do grupo.'
        : /\s/.test(name)
          ? 'O nome não pode conter espaços.'
          : taken
            ? 'Já existe um grupo com esse nome.'
            : null,
      culture: this.culture() ? null : 'Selecione a cultura.',
      plantingYear: !YEAR.test(planting)
        ? 'Informe o ano com 4 dígitos.'
        : Number(planting) < 2000
          ? 'O ano deve ser 2000 ou posterior.'
          : null,
      harvestYear: !YEAR.test(harvest)
        ? 'Informe o ano com 4 dígitos.'
        : YEAR.test(planting) && Number(harvest) < Number(planting)
          ? 'A colheita não pode ser antes do plantio.'
          : null,
    };
  });

  readonly valid = computed(() => Object.values(this.errors()).every((e) => e === null));

  protected show(field: string) {
    return this.touched().has(field) || this.touched().has('*');
  }

  protected touch(field: string) {
    this.touched.update((set) => new Set(set).add(field));
  }

  protected digits(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    return input.value;
  }

  submit(event?: Event) {
    event?.preventDefault();
    this.touch('*');
    if (!this.valid()) return;
    this.submitted.emit({
      name: this.name().trim(),
      cultureType: Number(this.culture()),
      plantingYear: Number(this.plantingYear()),
      harvestYear: Number(this.harvestYear()),
    });
  }
}
