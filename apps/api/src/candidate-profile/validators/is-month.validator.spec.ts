import { validateSync } from 'class-validator';
import { IsMonth } from './is-month.validator';

class Sample {
  @IsMonth()
  value!: unknown;
}

const messagesFor = (value: unknown): string[] => {
  const sample = new Sample();
  sample.value = value;
  return validateSync(sample).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
};

describe('IsMonth', () => {
  it.each(['2026-10', '1956-10', '1956-09', '1950-01', '1900-01'])(
    'aceita "%s" (antiguidade não é erro; só o piso técnico de 1900)',
    (value) => {
      expect(messagesFor(value)).toEqual([]);
    },
  );

  it('rejeita ano anterior a 1900 com mensagem de data antiga', () => {
    expect(messagesFor('1899-12')).toEqual([
      'A data não pode ser anterior a 01/1900.',
    ]);
  });

  it.each(['abc', '2024-13', '2024-3', '', 202403, null])(
    'rejeita formato inválido (%s) com a mensagem de formato',
    (value) => {
      expect(messagesFor(value)).toEqual(['value deve estar no formato AAAA-MM.']);
    },
  );
});
