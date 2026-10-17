import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { Icon } from './icon';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, kind: Toast['kind'] = 'success', durationMs = 3500) {
    const toast: Toast = { id: this.nextId++, kind, message };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  error(message: string) {
    this.show(message, 'error', 5000);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toast-host" role="status" aria-live="polite">
      @for (toast of service.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.kind">
          <app-icon [name]="toast.kind === 'success' ? 'check' : 'alert'" />
          <span>{{ toast.message }}</span>
          <button type="button" class="btn-icon" aria-label="Fechar" (click)="service.dismiss(toast.id)">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  protected readonly service = inject(ToastService);
}
