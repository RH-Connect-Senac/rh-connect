import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { normalizeLoginEmail } from '../utils/email-normalization';

/**
 * Valida a sintaxe e o domínio do e-mail de Login usando a MESMA função
 * usada dentro de `AuthService.login()` (`normalizeLoginEmail`) — ao
 * contrário de `@IsEmail()` puro, valida o e-mail já normalizado (trim +
 * lowercase), então aceita whitespace externo (ex.: " lucas@gmail.com ") em
 * vez de rejeitá-lo por conter espaços. Assim como o cadastro, o Login exige
 * domínio `gmail.com` e PRESERVA "+" na parte local (decisão de produto
 * final): "usuario+tag@gmail.com" é um e-mail de Login válido, mas só
 * autentica a conta cadastrada literalmente com esse endereço — nunca a
 * conta "usuario@gmail.com".
 */
export function IsLoginEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLoginEmail',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return normalizeLoginEmail(value) !== null;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Use um e-mail válido do Gmail, no formato nome@gmail.com.';
        },
      },
    });
  };
}
