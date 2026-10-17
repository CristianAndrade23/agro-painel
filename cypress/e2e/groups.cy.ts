import { candidatesForGroup, groupWithFarmings, seed } from '../support/seed';

function openCreateForm() {
  cy.contains('button', 'Criar grupo').click();
  return cy.openDialog();
}

function fillGroup(name: string, culture: string, planting: string, harvest: string) {
  cy.get('dialog[open]').within(() => {
    cy.get('input').eq(0).clear().type(name);
    cy.get('select').select(culture);
    cy.get('input[placeholder=aaaa]').eq(0).clear().type(planting);
    cy.get('input[placeholder=aaaa]').eq(1).clear().type(harvest);
  });
}

describe('Grupos de comparação', () => {
  beforeEach(() => {
    cy.visitAsAdmin('/painel/grupos');
    cy.get('tbody tr').should('have.length', seed.groups.length);
  });

  it('busca grupos por nome, cultura ou ano', () => {
    cy.get('input[type=search]').type(groupWithFarmings.name);
    cy.get('tbody tr').should('have.length', 1).and('contain', groupWithFarmings.cultureType);
  });

  it('valida o formulário antes de criar', () => {
    openCreateForm().within(() => {
      cy.contains('button', 'Criar grupo').click();
      cy.contains('.field__error', 'Informe o nome do grupo.');
      cy.contains('.field__error', 'Selecione a cultura.');
    });

    fillGroup('meu grupo', 'Soja', '1999', '1998');
    cy.get('dialog[open]').within(() => {
      cy.contains('.field__error', 'O nome não pode conter espaços.');
      cy.contains('.field__error', 'O ano deve ser 2000 ou posterior.');
      cy.contains('.field__error', 'A colheita não pode ser antes do plantio.');
    });

    // Campos de ano aceitam apenas dígitos.
    cy.get('dialog[open] input[placeholder=aaaa]').first().clear().type('20ab25').should('have.value', '2025');
  });

  it('impede nome de grupo duplicado', () => {
    openCreateForm();
    fillGroup(groupWithFarmings.name.toLowerCase(), 'Milho', '2025', '2026');
    cy.contains('.field__error', 'Já existe um grupo com esse nome.').should('be.visible');
  });

  it('cria, edita e exclui um grupo', () => {
    openCreateForm();
    fillGroup('MILHO-E2E', 'Milho', '2025', '2026');
    cy.get('dialog[open] input').first().type('{enter}');

    cy.toast('Grupo MILHO-E2E criado.');
    cy.get('dialog[open]').should('not.exist');
    cy.get('tbody tr').should('have.length', seed.groups.length + 1);
    cy.contains('tbody tr', 'MILHO-E2E').should('contain', 'Milho').and('contain', '2025/2026');

    // Sem lavouras vinculadas, todos os campos podem ser editados.
    cy.get('[aria-label="Editar MILHO-E2E"]').click();
    cy.openDialog().within(() => {
      cy.get('select').should('be.enabled');
      cy.get('input').first().clear().type('MILHO-E2E-V2');
      cy.get('input[placeholder=aaaa]').eq(1).clear().type('2027');
      cy.contains('button', 'Salvar alterações').click();
    });
    cy.toast('Grupo MILHO-E2E-V2 atualizado.');
    cy.contains('tbody tr', 'MILHO-E2E-V2').should('contain', '2025/2027');

    cy.get('[aria-label="Excluir MILHO-E2E-V2"]').click();
    cy.openDialog().should('contain', 'Deseja mesmo excluir').contains('button', 'Excluir').click();
    cy.toast('Grupo MILHO-E2E-V2 excluído.');
    cy.get('tbody tr').should('have.length', seed.groups.length);
  });

  it('restringe a edição de grupos que já têm lavouras', () => {
    cy.get(`[aria-label="Editar ${groupWithFarmings.name}"]`).click();
    cy.openDialog().within(() => {
      cy.contains('.alert', 'apenas o nome pode ser alterado').should('be.visible');
      cy.get('select').should('be.disabled');
      cy.get('input[placeholder=aaaa]').each((input) => expect(input).to.be.disabled);
    });
  });

  it('bloqueia a exclusão de grupos com lavouras vinculadas', () => {
    cy.get(`[aria-label="Excluir ${groupWithFarmings.name}"]`).click();
    cy.openDialog().within(() => {
      cy.contains('remova antes as lavouras vinculadas').should('be.visible');
      cy.contains('button', 'Excluir').should('not.exist');
      cy.contains('button', 'Fechar').click();
    });
    cy.get('dialog[open]').should('not.exist');
  });

  it('vincula e desvincula lavouras compatíveis', () => {
    cy.contains('tbody tr', groupWithFarmings.name).contains('button', 'Gerenciar lavouras').click();
    cy.openDialog().within(() => {
      cy.contains(`Lavouras no grupo (${groupWithFarmings.linked})`).should('be.visible');
      cy.get('.chip').should('have.length', groupWithFarmings.linked);

      cy.get('.chip').first().find('.chip__remove').click();
      cy.contains(`Lavouras no grupo (${groupWithFarmings.linked - 1})`).should('be.visible');

      cy.get('[role=combobox]').should('be.enabled').focus();
      cy.get('[role=option]').should('have.length', candidatesForGroup.length + 1);
      cy.get('[role=option]').first().click();
      cy.contains(`Lavouras no grupo (${groupWithFarmings.linked})`).should('be.visible');
    });
  });
});
