import {
  currentMonth,
  dateToMonth,
  isValidMonthString,
  isWellFormedMonth,
  monthToDate,
  nullableDateToMonth,
} from './month-date';

describe('month-date', () => {
  it('converte "AAAA-MM" para o primeiro dia do mês (UTC)', () => {
    expect(monthToDate('2024-03').toISOString()).toBe(
      '2024-03-01T00:00:00.000Z',
    );
    expect(monthToDate('1999-12').toISOString()).toBe(
      '1999-12-01T00:00:00.000Z',
    );
  });

  it('converte Date para "AAAA-MM" ignorando o dia', () => {
    expect(dateToMonth(new Date('2024-03-01T00:00:00.000Z'))).toBe('2024-03');
    expect(dateToMonth(new Date('2024-03-27T23:59:59.000Z'))).toBe('2024-03');
  });

  it('ida e volta preserva o mês', () => {
    expect(dateToMonth(monthToDate('2026-01'))).toBe('2026-01');
    expect(dateToMonth(monthToDate('2026-12'))).toBe('2026-12');
  });

  it('nullableDateToMonth devolve null para null', () => {
    expect(nullableDateToMonth(null)).toBeNull();
  });

  it.each(['2024-13', '2024-00', '2024-3', '24-03', '2024-03-01', '', 'abc'])(
    'rejeita "%s"',
    (value) => {
      expect(isValidMonthString(value)).toBe(false);
      expect(() => monthToDate(value)).toThrow();
    },
  );

  it('rejeita não-string e ano anterior a 1900', () => {
    expect(isValidMonthString(202403)).toBe(false);
    expect(isValidMonthString(null)).toBe(false);
    expect(isValidMonthString('1899-12')).toBe(false);
  });

  it('aceita datas antigas acima do piso técnico (antiguidade não é erro na API)', () => {
    expect(isValidMonthString('1900-01')).toBe(true);
    expect(isValidMonthString('1950-01')).toBe(true);
    expect(isValidMonthString('1956-09')).toBe(true);
    expect(monthToDate('1900-01').toISOString()).toBe('1900-01-01T00:00:00.000Z');
  });

  it('currentMonth usa o mês da data informada', () => {
    expect(currentMonth(new Date('2026-10-06T10:00:00.000Z'))).toBe('2026-10');
  });

  describe('isWellFormedMonth', () => {
    it('aceita formato correto mesmo abaixo do piso técnico; rejeita formato errado', () => {
      expect(isWellFormedMonth('1899-12')).toBe(true);
      expect(isWellFormedMonth('2024-03')).toBe(true);
      expect(isWellFormedMonth('2024-13')).toBe(false);
      expect(isWellFormedMonth(202403)).toBe(false);
    });
  });
});
