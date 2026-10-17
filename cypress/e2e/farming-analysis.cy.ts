import { otherProducer, producerWithBoth, producerWithoutFarmings } from '../support/seed';

/** Seleciona um produtor pelo autocomplete usando apenas o teclado. */
function pickProducer(name: string) {
  cy.get('[role=combobox]').should('be.enabled').type(name);
  cy.get('[role=listbox] [role=option]').first().should('have.text', ` ${name} `);
  cy.get('[role=combobox]').type('{downArrow}{upArrow}{enter}');
}

describe('Análise de lavouras', () => {
  beforeEach(() => cy.visitAsAdmin('/painel/lavouras'));

  it('orienta a seleção de um produtor', () => {
    cy.contains('Selecione um produtor para exibir suas lavouras.').should('be.visible');
  });

  it('separa as lavouras aptas e não aptas do produtor', () => {
    const { name, able, unable } = producerWithBoth;
    pickProducer(name);

    cy.contains('.chip.is-active', name).should('be.visible');
    cy.contains('h2', name).should('be.visible');
    cy.contains(`${able.length + unable.length} lavouras cadastradas`);
    cy.get('[data-cy=list-able] app-farming-card').should('have.length', able.length);
    cy.get('[data-cy=list-unable] app-farming-card').should('have.length', unable.length);
  });

  it('exibe o detalhamento de custos nos cenários estimado e efetivo', () => {
    const farming = producerWithBoth.able[0];
    pickProducer(producerWithBoth.name);

    cy.contains('app-farming-card', farming.name).as('card');
    cy.get('@card').contains('button', 'Detalhes').click();
    cy.get('@card').within(() => {
      for (const group of ['Custos diretos', 'Custos indiretos', 'Custos administrativos', 'Custo total']) {
        cy.contains('th', group).should('be.visible');
      }
      const production = (n: number) => `${n.toLocaleString('pt-BR')} sc`;
      cy.contains('dd', production(farming.estimatedProductionQuantity)).should('be.visible');
      cy.contains('button', 'Efetivo').click();
      cy.contains('dd', production(farming.effectiveProductionQuantity)).should('be.visible');
    });
  });

  it('habilita uma lavoura para comparação', () => {
    const { name, able, unable } = producerWithBoth;
    const farming = unable[0];
    pickProducer(name);

    cy.get('[data-cy=list-unable]').within(() => {
      cy.contains('button', 'Habilitar').should('be.disabled');
      cy.contains('app-farming-card', farming.name).find('input[type=checkbox]').check();
      cy.contains('button', 'Habilitar (1)').click();
    });

    cy.toast(`"${farming.name}" agora está apta para comparação.`);
    cy.get('[data-cy=list-able] app-farming-card').should('have.length', able.length + 1);
    cy.get('[data-cy=list-able]').should('contain', farming.name);
    cy.get('[data-cy=list-unable] app-farming-card').should('have.length', unable.length - 1);
  });

  it('desabilita lavouras em lote', () => {
    const { name, able, unable } = producerWithBoth;
    pickProducer(name);

    cy.get('[data-cy=list-able] input[type=checkbox]').check();
    cy.get('[data-cy=list-able]').contains('button', `Desabilitar (${able.length})`).click();

    cy.toast(
      able.length === 1
        ? `"${able[0].name}" não está mais apta para comparação.`
        : `${able.length} lavouras não estão mais aptas para comparação.`,
    );
    cy.get('[data-cy=list-able]').should('contain', 'Nenhuma lavoura apta para comparação.');
    cy.get('[data-cy=list-unable] app-farming-card').should('have.length', unable.length + able.length);
  });

  it('informa quando o produtor não tem lavouras', () => {
    pickProducer(producerWithoutFarmings);
    cy.contains(`${producerWithoutFarmings} não possui lavouras cadastradas`).should('be.visible');
  });

  it('alterna e remove produtores selecionados', () => {
    pickProducer(producerWithBoth.name);
    pickProducer(otherProducer);
    cy.get('.chip').should('have.length', 2);
    cy.contains('h2', otherProducer).should('be.visible');

    cy.contains('.chip', producerWithBoth.name).find('.chip__label').click();
    cy.contains('h2', producerWithBoth.name).should('be.visible');

    // Produtores já escolhidos somem das sugestões.
    cy.get('[role=combobox]').type(producerWithBoth.name);
    cy.get('[role=option]').should('not.exist');
    cy.contains('[role=listbox]', 'Nenhum produtor encontrado').should('be.visible');
    cy.get('[role=combobox]').clear().blur();

    cy.get(`[aria-label="Remover ${producerWithBoth.name}"]`).click();
    cy.get('.chip').should('have.length', 1);
    cy.contains('h2', otherProducer).should('be.visible');
  });
});
