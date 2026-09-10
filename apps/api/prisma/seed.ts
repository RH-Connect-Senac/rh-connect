import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

interface DemoUser {
  name: string
  email: string
  role: 'CANDIDATE' | 'EVALUATOR' | 'ADMIN'
  password: string
  onboardingCompleted: boolean
}

const demoUsers: DemoUser[] = [
  { name: 'Maria Silva (demo)', email: 'candidato@rhconnect.com', role: 'CANDIDATE', password: 'senha123', onboardingCompleted: true },
  { name: 'Carlos Souza (demo)', email: 'avaliador@rhconnect.com', role: 'EVALUATOR', password: 'senha123', onboardingCompleted: true },
  { name: 'Ana Lima (demo)', email: 'admin@rhconnect.com', role: 'ADMIN', password: 'senha123', onboardingCompleted: true },
];

async function main(): Promise<void> {
  for (const demo of demoUsers) {
    await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        name: demo.name,
        email: demo.email,
        role: demo.role,
        passwordHash: hashPassword(demo.password),
        onboardingCompleted: demo.onboardingCompleted,
      },
    });
  }
  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });