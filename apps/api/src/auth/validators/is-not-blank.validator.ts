import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Valida que o valor é uma string e que, após trim(), não fica vazia.
 * Usado no `name` do cadastro de Candidato (Prompt 02).
 */
export function IsNotBlank(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotBlank',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return typeof value === 'string' && value.trim().length > 0;
        },
        defaultMessage(_args: ValidationArguments) {
          return `${propertyName} não pode ficar em branco.`;
        },
      },
    });
  };
}
