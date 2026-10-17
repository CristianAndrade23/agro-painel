/// <reference types="cypress" />

/**
 * Comandos customizados.
 *
 * Os testes rodam em dois modos (valor exposto `API_MODE`, via `--expose`):
 * - `mock` (padrão): app servido pelo `ng serve`, API dentro do navegador. O localStorage limpo
 *   a cada teste (testIsolation) já devolve o seed.
 * - `server`: app servido pelo backend Express. Antes de cada teste a base do servidor é
 *   restaurada via POST /demo/reset e o login usa um JWT real.
 */

const API = '/api/v1';
const DEMO_USER = { clientId: 1, clientName: 'Administrador' };
const MOCK_TOKEN = 'Bearer demo.' + btoa(JSON.stringify(DEMO_USER));

export const isServerMode = () => Cypress.expose('API_MODE') === 'server';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Entra pela tela de login, como um usuário faria. */
      loginViaUi(username?: string, password?: string): Chainable<void>;
      /** Abre uma rota do painel já autenticado (sessão gravada antes do app carregar). */
      visitAsAdmin(path?: string): Chainable<void>;
      /** Clica num item do menu lateral. */
      navigateTo(label: string): Chainable<void>;
      /** Modal aberto no momento (<dialog open>). */
      openDialog(): Chainable<JQuery<HTMLDialogElement>>;
      /** Aguarda um toast com o texto informado. */
      toast(text: string | RegExp): Chainable<JQuery<HTMLElement>>;
    }
  }
}

beforeEach(() => {
  if (isServerMode()) cy.request('POST', `${API}/demo/reset`);
});

function storeSession(token: string, user: unknown) {
  return (win: Window) => {
    win.localStorage.setItem('agro-painel:token', JSON.stringify(token));
    win.localStorage.setItem('agro-painel:user', JSON.stringify(user));
  };
}

Cypress.Commands.add('loginViaUi', (username = 'admin', password = 'admin123') => {
  cy.visit('/login');
  cy.get('input[name=username]').type(username);
  cy.get('input[name=password]').type(password, { log: false });
  cy.contains('button', 'Entrar').click();
});

Cypress.Commands.add('visitAsAdmin', (path = '/painel') => {
  if (!isServerMode()) {
    cy.visit(path, { onBeforeLoad: storeSession(MOCK_TOKEN, DEMO_USER) });
    return;
  }
  cy.request('POST', `${API}/authentication/signin`, { username: 'admin', password: 'admin123', adm: true })
    .its('body.token')
    .then((token: string) => {
      cy.request({ url: `${API}/authentication/decrypt`, headers: { Authorization: token } })
        .its('body')
        .then((user) => cy.visit(path, { onBeforeLoad: storeSession(token, user) }));
    });
});

Cypress.Commands.add('navigateTo', (label: string) => {
  cy.get('nav[aria-label="Menu principal"]').contains('a', label).click();
});

Cypress.Commands.add('openDialog', () => cy.get<HTMLDialogElement>('dialog[open]').should('be.visible'));

Cypress.Commands.add('toast', (text: string | RegExp) => cy.contains('.toast', text).should('be.visible'));

export {};
