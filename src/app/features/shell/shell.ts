import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { DemoApi } from '../../core/api/demo.api';
import { SessionService } from '../../core/auth/session.service';
import { Icon, IconName } from '../../shared/icon';
import { ToastService } from '../../shared/toast';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export default class Shell {
  protected readonly session = inject(SessionService);
  private readonly demoApi = inject(DemoApi);
  private readonly toast = inject(ToastService);

  protected readonly menuOpen = signal(false);
  protected readonly resetting = signal(false);

  protected readonly nav: { section: string; items: NavItem[] }[] = [
    {
      section: 'Assinaturas',
      items: [
        { path: '/painel', label: 'Início', icon: 'home', exact: true },
        { path: '/painel/usuarios', label: 'Usuários', icon: 'users' },
        { path: '/painel/planos-a-vencer', label: 'Planos a vencer', icon: 'calendar' },
      ],
    },
    {
      section: 'Comparação de safras',
      items: [
        { path: '/painel/lavouras', label: 'Análise de lavouras', icon: 'sprout' },
        { path: '/painel/grupos', label: 'Grupos de comparação', icon: 'layers' },
      ],
    },
  ];

  protected resetDemoData() {
    this.resetting.set(true);
    this.demoApi.reset().subscribe({
      // Recarrega a página para que todas as telas busquem os dados do seed novamente.
      next: () => window.location.reload(),
      error: (e) => {
        this.resetting.set(false);
        this.toast.error(apiErrorMessage(e, 'Não foi possível restaurar os dados.'));
      },
    });
  }
}
