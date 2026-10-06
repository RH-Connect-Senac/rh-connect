// Datas de formação, cursos e experiências trafegam como "AAAA-MM" na API e
// são persistidas como o PRIMEIRO dia do mês (coluna DATE). O dia nunca é
// exposto. Tudo em UTC para não deslocar o mês por fuso horário.
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 1900;

export function isValidMonthString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = MONTH_PATTERN.exec(value);
  return !!match && Number(match[1]) >= MIN_YEAR;
}

/** "2024-03" -> 2024-03-01T00:00:00.000Z. Lança Error se inválido. */
export function monthToDate(value: string): Date {
  const match = MONTH_PATTERN.exec(value);
  if (!match || Number(match[1]) < MIN_YEAR) {
    throw new Error(`Mês inválido: ${value}`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
}

/** Date -> "AAAA-MM" (ignora o dia). */
export function dateToMonth(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function nullableDateToMonth(date: Date | null): string | null {
  return date ? dateToMonth(date) : null;
}

/** Mês corrente em "AAAA-MM" (UTC). `now` é injetável para testes. */
export function currentMonth(now: Date = new Date()): string {
  return dateToMonth(now);
}
