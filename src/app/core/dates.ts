import type { ApiDate } from './models.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate([year, month, day]: ApiDate): Date {
  return new Date(year, month - 1, day);
}

export function fromDate(date: Date): ApiDate {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Dias corridos entre hoje e a data (negativo quando já passou). */
export function daysFromToday(date: ApiDate): number {
  return Math.round((toDate(date).getTime() - today().getTime()) / DAY_MS);
}

/** dd/mm/aaaa */
export function formatApiDate(date: ApiDate): string {
  return toDate(date).toLocaleDateString('pt-BR');
}

/** aaaa-mm-dd — formato do <input type="date"> e do endpoint de alteração de vencimento. */
export function toIsoDate(date: ApiDate): string {
  const [y, m, d] = date;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function fromIsoDate(iso: string): ApiDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date: ApiDate = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = toDate(date);
  return check.getMonth() + 1 === date[1] && check.getDate() === date[2] ? date : null;
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "em 3 dias", "há 2 meses", "amanhã"… */
export function relativeFromToday(date: ApiDate): string {
  const days = daysFromToday(date);
  const abs = Math.abs(days);
  if (abs < 30) return relative.format(days, 'day');
  if (abs < 365) return relative.format(Math.round(days / 30), 'month');
  return relative.format(Math.round(days / 365), 'year');
}
