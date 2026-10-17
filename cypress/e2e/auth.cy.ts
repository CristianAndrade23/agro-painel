describe('Autenticação', () => {
  it('redireciona visitantes para o login', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
    cy.contains('AgroPainel').should('be.visible');
  });

  it('mantém o botão desabilitado até preencher usuário e senha', () => {
    cy.visit('/login');
    cy.contains('button', 'Entrar').should('be.disabled');
    cy.get('input[name=username]').type('admin');
    cy.contains('button', 'Entrar').should('be.disabled');
    cy.get('input[name=password]').type('x');
    cy.contains('button', 'Entrar').should('be.enabled');
  });

  it('exibe erro com credenciais inválidas', () => {
    cy.loginViaUi('admin', 'senha-errada');
    cy.get('[role=alert]').should('contain', 'Credenciais inválidas');
    cy.location('pathname').should('eq', '/login');
  });

  it('entra com as credenciais de demonstração', () => {
    cy.visit('/login');
    cy.contains('button', 'Preencher').click();
    cy.get('input[name=username]').should('have.value', 'admin');
    cy.contains('button', 'Entrar').click();

    cy.location('pathname').should('eq', '/painel');
    cy.contains('h1', 'Olá, Administrador.').should('be.visible');
    cy.title().should('eq', 'Início · AgroPainel');
  });

  it('mantém a sessão após recarregar a página', () => {
    cy.loginViaUi();
    cy.location('pathname').should('eq', '/painel');
    cy.reload();
    cy.contains('h1', 'Olá, Administrador.').should('be.visible');
  });

  it('protege as rotas do painel', () => {
    cy.visit('/painel/grupos');
    cy.location('pathname').should('eq', '/login');
  });

  it('envia o usuário autenticado direto para o painel', () => {
    cy.visitAsAdmin('/login');
    cy.location('pathname').should('eq', '/painel');
  });

  it('encerra a sessão ao sair', () => {
    cy.visitAsAdmin('/painel/usuarios');
    cy.contains('button', 'Sair').click();
    cy.location('pathname').should('eq', '/login');

    cy.visit('/painel/usuarios');
    cy.location('pathname').should('eq', '/login');
  });
});
