/// <reference types="cypress" />

/**
 * Comandos customizados.
 *
 * Cada teste começa com o localStorage limpo (testIsolation), então a API mock
 * recria o seed determinístico a cada teste — os cenários não dependem uns dos outros.
 */

const DEMO_USER = { clientId: 1, clientName: 'Administrador' };
const DEMO_TOKEN = 'Bearer demo.' + btoa(JSON.stringify(DEMO_USER));

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

Cypress.Commands.add('loginViaUi', (username = 'admin', password = 'admin123') => {
  cy.visit('/login');
  cy.get('input[name=username]').type(username);
  cy.get('input[name=password]').type(password, { log: false });
  cy.contains('button', 'Entrar').click();
});

Cypress.Commands.add('visitAsAdmin', (path = '/painel') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('agro-painel:token', JSON.stringify(DEMO_TOKEN));
      win.localStorage.setItem('agro-painel:user', JSON.stringify(DEMO_USER));
    },
  });
});

Cypress.Commands.add('navigateTo', (label: string) => {
  cy.get('nav[aria-label="Menu principal"]').contains('a', label).click();
});

Cypress.Commands.add('openDialog', () => cy.get<HTMLDialogElement>('dialog[open]').should('be.visible'));

Cypress.Commands.add('toast', (text: string | RegExp) => cy.contains('.toast', text).should('be.visible'));

export {};
