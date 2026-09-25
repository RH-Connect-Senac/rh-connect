import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  passwordMeetsPolicy,
  passwordWithinByteLimit,
} from '../utils/password-policy';

/**
 * Valida a senha de cadastro de Candidato segundo a política D12: mínimo de
 * 8 caracteres, maiúscula, minúscula, dígito e caractere especial, além do
 * limite de 72 bytes UTF-8 (bcrypt). Aplicado apenas ao cadastro — o Login
 * não usa este validador.
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return (
            typeof value === 'string' &&
            passwordMeetsPolicy(value) &&
            passwordWithinByteLimit(value)
          );
        },
        defaultMessage(_args: ValidationArguments) {
          return 'A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial.';
        },
      },
    });
  };
}
