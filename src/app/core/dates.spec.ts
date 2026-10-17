import { daysFromToday, formatApiDate, fromDate, fromIsoDate, relativeFromToday, toIsoDate, today } from './dates';

const shift = (days: number) => fromDate(new Date(today().getTime() + days * 86_400_000));

describe('dates', () => {
  it('formata datas da API no padrão brasileiro', () => {
    expect(formatApiDate([2025, 3, 7])).toBe('07/03/2025');
  });

  it('converte entre ApiDate e ISO', () => {
    expect(toIsoDate([2025, 3, 7])).toBe('2025-03-07');
    expect(fromIsoDate('2025-03-07')).toEqual([2025, 3, 7]);
  });

  it('rejeita datas ISO inexistentes', () => {
    expect(fromIsoDate('2025-02-30')).toBeNull();
    expect(fromIsoDate('07/03/2025')).toBeNull();
  });

  it('calcula dias a partir de hoje', () => {
    expect(daysFromToday(shift(0))).toBe(0);
    expect(daysFromToday(shift(10))).toBe(10);
    expect(daysFromToday(shift(-3))).toBe(-3);
  });

  it('gera texto relativo em português', () => {
    expect(relativeFromToday(shift(1))).toBe('amanhã');
    expect(relativeFromToday(shift(-5))).toBe('há 5 dias');
    expect(relativeFromToday(shift(60))).toBe('em 2 meses');
  });
});
