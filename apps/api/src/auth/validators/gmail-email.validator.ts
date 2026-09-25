import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { normalizeGmailEmail } from '../utils/email-normalization';

/**
 * Valida que o valor é um e-mail Gmail válido segundo a normalização
 * definida em `normalizeGmailEmail` (decisão de produto final: "+" na parte
 * local é PRESERVADO, nunca removido/rejeitado — "lucas+senac@gmail.com" é
 * um e-mail válido e distinto de "lucas@gmail.com", nunca equivalente a
 * ele). Usa a MESMA função de normalização utilizada dentro de
 * `AuthService.register()`, para que validação e persistência nunca
 * divirjam.
 */
export function IsGmailEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGmailEmail',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return normalizeGmailEmail(value) !== null;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Use um e-mail válido do Gmail, no formato nome@gmail.com.';
        },
      },
    });
  };
}
