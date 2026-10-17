import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { SessionService } from '../../core/auth/session.service';
import { appSettings } from '../../core/config';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export default class Login {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly demo = appSettings.demoCredentials;
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly canSubmit = computed(
    () => !this.loading() && this.username().trim() !== '' && this.password() !== '',
  );

  protected fillDemo() {
    this.username.set(this.demo.username);
    this.password.set(this.demo.password);
    this.error.set(null);
  }

  protected submit(event: Event) {
    event.preventDefault();
    if (!this.canSubmit()) return;
    this.loading.set(true);
    this.error.set(null);
    this.session.login(this.username().trim(), this.password()).subscribe({
      next: () => this.router.navigate(['/painel']),
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Não foi possível entrar.'));
        this.loading.set(false);
      },
    });
  }
}
