import { plans } from '../support/seed';

describe('Planos a vencer', () => {
  beforeEach(() => {
    cy.visitAsAdmin('/painel/planos-a-vencer');
    cy.get('tbody tr').should('have.length.greaterThan', 0);
  });

  it('separa planos a vencer e vencidos em abas', () => {
    cy.contains('[role=tab]', 'A vencer').should('have.attr', 'aria-selected', 'true').and('contain', plans.toExpire);
    cy.contains('[role=tab]', 'Vencidos').should('contain', plans.expired);
    cy.get('tbody .badge--expired').should('not.exist');

    cy.contains('[role=tab]', 'Vencidos').click();
    cy.get('tbody tr').should('have.length', Math.min(plans.expired, 10));
    cy.get('tbody .badge--expired').each((badge) => expect(badge.text()).to.match(/^\s*Venceu/));
  });

  it('ordena os planos a vencer pelos mais urgentes', () => {
    cy.get('tbody tr td:nth-child(3)').then((cells) => {
      const dates = [...cells].map((c) => {
        const [d, m, y] = c.innerText.trim().split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
      });
      expect(dates).to.deep.equal([...dates].sort((a, b) => a - b));
    });
  });

  it('valida a nova data de vencimento', () => {
    cy.get('tbody tr').first().find('button[aria-label^="Alterar vencimento"]').click();
    cy.openDialog().within(() => {
      cy.get('input[type=date]').clear().type('2000-01-01');
      cy.get('.field__error').should('contain', 'posterior ao início do plano');
      cy.contains('button', 'Salvar').should('be.disabled');
    });
  });

  it('renova um plano vencido por mais um ano', () => {
    cy.contains('[role=tab]', 'Vencidos').click();
    cy.get('tbody tr')
      .first()
      .then((row) => {
        const name = row.find('td').first().text().trim();
        cy.wrap(row).find('button[aria-label^="Alterar vencimento"]').click();

        cy.openDialog().within(() => {
          cy.contains('button', 'Renovar por +1 ano').click();
          cy.get('.field__error').should('not.exist');
          cy.contains('button', 'Salvar').click();
        });

        cy.toast(`Vencimento de ${name} atualizado.`);
        cy.contains('[role=tab]', 'Vencidos').should('contain', plans.expired - 1);
        cy.contains('tbody tr', name).should('not.exist');

        cy.contains('[role=tab]', 'A vencer').click().should('contain', plans.toExpire + 1);
        cy.get('input[type=search]').type(name);
        cy.contains('tbody tr', name).find('.badge').last().should('contain', 'Vence em');
      });
  });
});
