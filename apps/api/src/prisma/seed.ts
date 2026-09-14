import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('senha123', 10);

  // CANDIDATE 1
  const candidato1 = await prisma.app_user.upsert({
    where: { email: 'candidato@rhconnect.com' },
    update: {},
    create: {
      name: 'Maria Silva (demo)',
      email: 'candidato@rhconnect.com',
      password_hash,
      user_role: 'CANDIDATE',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    },
  });

  await prisma.candidate_profile.upsert({
    where: { user_id: candidato1.user_id },
    update: {},
    create: {
      user_id: candidato1.user_id,
    },
  });

  // CANDIDATE 2
  const candidato2 = await prisma.app_user.upsert({
    where: { email: 'candidato2@rhconnect.com' },
    update: {},
    create: {
      name: 'Pedro Santos (demo)',
      email: 'candidato2@rhconnect.com',
      password_hash,
      user_role: 'CANDIDATE',
      account_status: 'ACTIVE',
      onboarding_completed_at: null,
    },
  });

  await prisma.candidate_profile.upsert({
    where: { user_id: candidato2.user_id },
    update: {},
    create: {
      user_id: candidato2.user_id,
    },
  });

  // EVALUATOR ACTIVE
  await prisma.app_user.upsert({
    where: { email: 'avaliador@rhconnect.com' },
    update: {},
    create: {
      name: 'João Avaliador (demo)',
      email: 'avaliador@rhconnect.com',
      password_hash,
      user_role: 'EVALUATOR',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    },
  });

  // ADMIN
  await prisma.app_user.upsert({
    where: { email: 'admin@rhconnect.com' },
    update: {},
    create: {
      name: 'Admin (demo)',
      email: 'admin@rhconnect.com',
      password_hash,
      user_role: 'ADMIN',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    },
  });

  // EVALUATOR INVITED
  const avaliadorConvidado = await prisma.app_user.upsert({
    where: { email: 'avaliador-convidado@rhconnect.com' },
    update: {},
    create: {
      name: 'Avaliador Convidado (demo)',
      email: 'avaliador-convidado@rhconnect.com',
      password_hash: null,
      user_role: 'EVALUATOR',
      account_status: 'INVITED',
      onboarding_completed_at: null,
    },
  });

  await prisma.evaluator_profile.upsert({
    where: { user_id: avaliadorConvidado.user_id },
    update: {},
    create: {
      user_id: avaliadorConvidado.user_id,
    },
  });

  const activationToken = 'seed-evaluator-invite-token';

  const token_hash = createHash('sha256')
    .update(activationToken)
    .digest('hex');

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 7);

  await prisma.account_activation_token.upsert({
    where: { token_hash },
    update: {},
    create: {
      user_id: avaliadorConvidado.user_id,
      token_hash,
      token_purpose: 'EVALUATOR_INVITE',
      expires_at,
    },
  });

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());