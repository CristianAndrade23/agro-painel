import { TestBed } from '@angular/core/testing';
import { GroupRequest } from '../../core/models';
import { GroupForm } from './group-form';

describe('GroupForm', () => {
  async function setup(existingNames: string[] = []) {
    const fixture = TestBed.createComponent(GroupForm);
    fixture.componentRef.setInput('existingNames', existingNames);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = el.querySelectorAll('input');
    const select = el.querySelector('select')!;
    const emitted: GroupRequest[] = [];
    fixture.componentInstance.submitted.subscribe((r) => emitted.push(r));

    const type = (input: HTMLInputElement | HTMLSelectElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
    };
    const fill = async (name: string, culture: string, planting: string, harvest: string) => {
      type(inputs[0], name);
      type(select, culture);
      type(inputs[1], planting);
      type(inputs[2], harvest);
      fixture.componentInstance.submit();
      await fixture.whenStable();
    };
    const errors = () => [...el.querySelectorAll('.field__error')].map((e) => e.textContent?.trim());
    return { fill, errors, emitted };
  }

  it('emite o grupo quando os dados são válidos', async () => {
    const { fill, emitted, errors } = await setup();
    await fill('SOJA-2526', '2', '2025', '2026');
    expect(errors()).toEqual([]);
    expect(emitted).toEqual([{ name: 'SOJA-2526', cultureType: 2, plantingYear: 2025, harvestYear: 2026 }]);
  });

  it('valida espaços no nome e safra invertida', async () => {
    const { fill, emitted, errors } = await setup();
    await fill('meu grupo', '2', '2025', '2024');
    expect(emitted).toEqual([]);
    expect(errors()).toContain('O nome não pode conter espaços.');
    expect(errors()).toContain('A colheita não pode ser antes do plantio.');
  });

  it('impede nome já utilizado (sem diferenciar maiúsculas)', async () => {
    const { fill, emitted, errors } = await setup(['SOJA-2526']);
    await fill('soja-2526', '2', '2025', '2026');
    expect(emitted).toEqual([]);
    expect(errors()).toContain('Já existe um grupo com esse nome.');
  });
});
