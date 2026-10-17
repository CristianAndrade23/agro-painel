import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { apiErrorMessage } from '../../core/api/api-error';
import { GroupsApi } from '../../core/api/groups.api';
import { Group, GroupRequest } from '../../core/models';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';
import { Paginator, paginate } from '../../shared/paginator';
import { matches } from '../../shared/text';
import { ToastService } from '../../shared/toast';
import { GroupFarmings } from './group-farmings';
import { GroupForm } from './group-form';

type Editor = { mode: 'create' } | { mode: 'edit'; group: Group };

@Component({
  selector: 'app-groups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupFarmings, GroupForm, Icon, Modal, Paginator],
  templateUrl: './groups.html',
})
export default class Groups {
  private readonly api = inject(GroupsApi);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = 10;
  protected readonly groups = rxResource({ stream: () => this.api.list() });
  protected readonly names = computed(() => (this.groups.value() ?? []).map((g) => g.name));

  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const query = this.search();
    return (this.groups.value() ?? [])
      .filter((g) => !query || matches(`${g.name} ${g.cultureType} ${g.plantingYear}`, query))
      .sort((a, b) => b.plantingYear - a.plantingYear || a.name.localeCompare(b.name));
  });
  protected readonly page = linkedSignal({ source: this.search, computation: () => 1 });
  protected readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));

  // --- Criar / editar -------------------------------------------------------
  protected readonly editor = signal<Editor | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** Lavouras do grupo em edição/exclusão — define se a edição é restrita ou se a exclusão é permitida. */
  private readonly inspectedId = computed(() => {
    const editor = this.editor();
    return editor?.mode === 'edit' ? editor.group.id : this.deleting()?.id;
  });
  protected readonly inspected = rxResource({
    params: () => this.inspectedId(),
    stream: ({ params: id }) => this.api.farmings(id),
  });
  protected readonly hasFarmings = computed(() => (this.inspected.value()?.length ?? 0) > 0);

  protected openCreate() {
    this.serverError.set(null);
    this.editor.set({ mode: 'create' });
  }

  protected openEdit(group: Group) {
    this.serverError.set(null);
    this.editor.set({ mode: 'edit', group });
  }

  protected closeEditor(open: boolean) {
    if (!open) this.editor.set(null);
  }

  protected save(request: GroupRequest) {
    const editor = this.editor();
    if (!editor) return;
    this.saving.set(true);
    this.serverError.set(null);
    const call =
      editor.mode === 'create' ? this.api.create(request) : this.api.update(editor.group.id, request);
    call.subscribe({
      next: () => {
        this.toast.show(
          editor.mode === 'create' ? `Grupo ${request.name} criado.` : `Grupo ${request.name} atualizado.`,
        );
        this.saving.set(false);
        this.editor.set(null);
        this.groups.reload();
      },
      error: (e) => {
        this.serverError.set(apiErrorMessage(e));
        this.saving.set(false);
      },
    });
  }

  // --- Lavouras do grupo ----------------------------------------------------
  protected readonly managing = signal<Group | null>(null);

  // --- Excluir --------------------------------------------------------------
  protected readonly deleting = signal<Group | null>(null);

  protected confirmDelete() {
    const group = this.deleting();
    if (!group) return;
    this.saving.set(true);
    this.api.remove(group.id).subscribe({
      next: () => {
        this.toast.show(`Grupo ${group.name} excluído.`, 'info');
        this.saving.set(false);
        this.deleting.set(null);
        this.groups.reload();
      },
      error: (e) => {
        this.toast.error(apiErrorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
