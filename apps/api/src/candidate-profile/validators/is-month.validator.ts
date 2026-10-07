import { registerDecorator, ValidationOptions } from 'class-validator';
import { MIN_YEAR, isValidMonthString, isWellFormedMonth } from '../month-date';

/**
 * Valida string no formato "AAAA-MM" (mês 01-12, ano >= 1900 como piso técnico).
 * Formato correto porém abaixo do piso: mensagem de data antiga (não de formato).
 * Datas "muito antigas" acima do piso NÃO são rejeitadas (só aviso no frontend).
 */
export function IsMonth(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    const formatMessage =
      typeof validationOptions?.message === 'string'
        ? validationOptions.message
        : `${propertyName} deve estar no formato AAAA-MM.`;
    registerDecorator({
      name: 'isMonth',
      target: object.constructor,
      propertyName,
      options: {
        ...validationOptions,
        message: (args) =>
          isWellFormedMonth(args.value)
            ? `A data não pode ser anterior a 01/${MIN_YEAR}.`
            : formatMessage,
      },
      validator: {
        validate(value: unknown) {
          return isValidMonthString(value);
        },
        defaultMessage() {
          return `${propertyName} deve estar no formato AAAA-MM.`;
        },
      },
    });
  };
}
