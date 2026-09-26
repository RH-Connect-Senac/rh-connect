import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomBytes } from 'crypto';
import { ActivateEvaluatorDto } from './activate-evaluator.dto';

// QA de segurança (B5-03): o token de ativação é sempre gerado por
// `randomBytes(32).toString('hex')` (`AuthService.inviteEvaluator`) — ou
// seja, uma string hexadecimal de exatamente 64 caracteres. Estes testes
// cobrem só o campo `token` do DTO, validando esse contrato real de
// entrada (não testam a política de senha, já coberta em outro lugar).
describe('ActivateEvaluatorDto - contrato do token (B5-03)', () => {
  const validPassword = 'Senha!Forte123';

  async function validateToken(token: unknown) {
    const dto = plainToInstance(ActivateEvaluatorDto, {
      token,
      password: validPassword,
    });

    const errors = await validate(dto);

    return errors.filter((error) => error.property === 'token');
  }

  it('aceita um token hexadecimal de exatamente 64 caracteres (formato real gerado pelo sistema)', async () => {
    const tokenErrors = await validateToken(randomBytes(32).toString('hex'));

    expect(tokenErrors).toHaveLength(0);
  });

  it('rejeita um token menor que 64 caracteres', async () => {
    const shortToken = randomBytes(32).toString('hex').slice(0, 63);

    const tokenErrors = await validateToken(shortToken);

    expect(tokenErrors.length).toBeGreaterThan(0);
  });

  it('rejeita um token maior que 64 caracteres', async () => {
    const longToken = `${randomBytes(32).toString('hex')}a`;

    const tokenErrors = await validateToken(longToken);

    expect(tokenErrors.length).toBeGreaterThan(0);
  });

  it('rejeita um token com 64 caracteres, mas com caracteres não hexadecimais', async () => {
    const nonHexToken = 'z'.repeat(64);

    const tokenErrors = await validateToken(nonHexToken);

    expect(tokenErrors.length).toBeGreaterThan(0);
  });

  it('rejeita um token vazio', async () => {
    const tokenErrors = await validateToken('');

    expect(tokenErrors.length).toBeGreaterThan(0);
  });
});
