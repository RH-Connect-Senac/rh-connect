import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidMonthString } from '../month-date';

/** Valida string no formato "AAAA-MM" (mês 01-12, ano >= 1900). */
export function IsMonth(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMonth',
      target: object.constructor,
      propertyName,
      options: validationOptions,
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
