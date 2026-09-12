import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('senha123', 10);

  await prisma.app_user.upsert({
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

  console.log('Seed concluído.');
}

main().finally(() => prisma.$disconnect());