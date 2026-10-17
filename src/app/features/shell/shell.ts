import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { appSettings } from '../../core/config';
import { clearState } from '../../core/mock/mock-db';
import { resetMockDb } from '../../core/mock/mock-api.interceptor';
import { Icon, IconName } from '../../shared/icon';

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

  protected readonly isMock = appSettings.useMockApi;
  protected readonly menuOpen = signal(false);

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
    clearState();
    resetMockDb();
    // Recarrega a página para que todas as telas busquem os dados do seed novamente.
    window.location.reload();
  }
}
