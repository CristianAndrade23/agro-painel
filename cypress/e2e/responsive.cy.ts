describe('Layout responsivo', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    cy.visitAsAdmin('/painel');
    cy.contains('h1', 'Olá').should('be.visible');
  });

  it('esconde o menu lateral atrás de um botão', () => {
    cy.get('aside.sidebar').should('not.be.visible');
    cy.get('[aria-label="Abrir menu"]').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('aside.sidebar').should('be.visible');
    cy.get('[aria-label="Abrir menu"]').should('have.attr', 'aria-expanded', 'true');
  });

  it('fecha o menu ao navegar', () => {
    cy.get('[aria-label="Abrir menu"]').click();
    cy.navigateTo('Grupos de comparação');
    cy.location('pathname').should('eq', '/painel/grupos');
    cy.get('aside.sidebar').should('not.be.visible');
    cy.contains('h1', 'Grupos de comparação').should('be.visible');
  });

  it('fecha o menu ao tocar fora dele', () => {
    cy.get('[aria-label="Abrir menu"]').click();
    cy.get('.backdrop').click('right');
    cy.get('aside.sidebar').should('not.be.visible');
  });
});
