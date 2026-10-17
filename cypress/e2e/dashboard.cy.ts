import { plans, seed } from '../support/seed';

describe('Dashboard', () => {
  beforeEach(() => cy.visitAsAdmin('/painel'));

  it('mostra os indicadores calculados a partir dos dados', () => {
    cy.get('a.kpi').should('have.length', 5);

    const active = seed.plans.filter((p) => p.isActive).length;
    cy.contains('a.kpi', 'Planos ativos').should('contain', `${active}/${plans.total}`);
    cy.contains('a.kpi', 'Planos vencidos').should('contain', plans.expired);
    cy.contains('a.kpi', 'Grupos de comparação').should('contain', seed.groups.length);
    cy.contains('a.kpi', 'Receita anual ativa').should('contain', 'R$');
  });

  it('leva à tela correspondente ao clicar num indicador', () => {
    cy.contains('a.kpi', 'Vencem em 30 dias').click();
    cy.location('pathname').should('eq', '/painel/planos-a-vencer');
    cy.contains('h1', 'Planos a vencer').should('be.visible');
  });

  it('navega por todas as telas pelo menu lateral', () => {
    const pages = [
      ['Usuários', '/painel/usuarios', 'Usuários'],
      ['Planos a vencer', '/painel/planos-a-vencer', 'Planos a vencer'],
      ['Análise de lavouras', '/painel/lavouras', 'Análise de lavouras'],
      ['Grupos de comparação', '/painel/grupos', 'Grupos de comparação'],
      ['Início', '/painel', 'Olá, Administrador.'],
    ];
    for (const [menu, path, heading] of pages) {
      cy.navigateTo(menu);
      cy.location('pathname').should('eq', path);
      cy.contains('h1', heading).should('be.visible');
      cy.get('nav[aria-label="Menu principal"]').contains('a', menu).should('have.class', 'is-active');
    }
  });
});
