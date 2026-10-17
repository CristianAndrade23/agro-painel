import { fullName } from '../../src/app/core/models';
import { plans, seed } from '../support/seed';

describe('Usuários', () => {
  beforeEach(() => {
    cy.visitAsAdmin('/painel/usuarios');
    cy.get('tbody tr').should('have.length', 10);
  });

  it('pagina a lista de planos', () => {
    cy.get('.paginator__info').should('contain', `${plans.total} registros`);
    cy.get('.paginator__btn.is-active').invoke('text').should('match', /^\s*1\s*$/);

    cy.get('[aria-label="Próxima página"]').click();
    cy.get('.paginator__btn.is-active').should('contain', '2');

    const lastPageSize = plans.total % 10 || 10;
    cy.get('.paginator__btn').not('[aria-label]').last().click();
    cy.get('tbody tr').should('have.length', lastPageSize);
    cy.get('[aria-label="Próxima página"]').should('be.disabled');
  });

  it('busca por nome ignorando acentos e maiúsculas', () => {
    const target = seed.plans[0].producer;
    const query = fullName(target)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase();

    cy.get('input[type=search]').type(query);
    cy.get('tbody tr').should('have.length.at.least', 1);
    cy.get('tbody tr').each((row) => expect(row.text()).to.contain(fullName(target)));

    cy.get('input[type=search]').clear().type('ninguém-com-esse-nome');
    cy.contains('td', 'Nenhum usuário encontrado.').should('be.visible');
  });

  it('filtra por status', () => {
    const inactive = seed.plans.filter((p) => !p.isActive).length;
    cy.contains('.segmented button', 'inativos').click();
    cy.get('tbody [role=switch]').should('have.length', Math.min(inactive, 10));
    cy.get('tbody [role=switch]').each((sw) => expect(sw).to.have.attr('aria-checked', 'false'));
  });

  it('pede confirmação e pode cancelar a alteração de status', () => {
    cy.get('tbody tr').first().find('[role=switch]').as('switch').invoke('attr', 'aria-checked').then((before) => {
      cy.get('@switch').click();
      cy.openDialog().find('.modal__footer').contains('button', 'Cancelar').click();
      cy.get('dialog[open]').should('not.exist');
      cy.get('@switch').should('have.attr', 'aria-checked', before);
    });
  });

  it('ativa/desativa um plano e persiste a alteração', () => {
    cy.get('tbody tr')
      .first()
      .then((row) => {
        const name = row.find('td').first().text().trim();
        const wasActive = row.find('[role=switch]').attr('aria-checked') === 'true';
        const action = wasActive ? 'Desativar' : 'Ativar';

        cy.wrap(row).find('[role=switch]').click();
        cy.openDialog().should('contain', name).find('.modal__footer').contains('button', action).click();

        cy.toast(`Plano de ${name} ${wasActive ? 'desativado' : 'ativado'}.`);
        cy.contains('tbody tr', name)
          .find('[role=switch]')
          .should('have.attr', 'aria-checked', String(!wasActive));

        // A API mock grava no localStorage: o estado sobrevive a um reload.
        cy.reload();
        cy.contains('tbody tr', name)
          .find('[role=switch]')
          .should('have.attr', 'aria-checked', String(!wasActive));
      });
  });
});
