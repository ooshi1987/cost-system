/**
 * スーパー管理者アカウントを作成するスクリプト
 *
 * 使い方:
 *   npx tsx scripts/create-super-admin.ts <email> <password>
 *
 * 例:
 *   npx tsx scripts/create-super-admin.ts admin@example.com mypassword123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('使い方: npx tsx scripts/create-super-admin.ts <email> <password>');
    process.exit(1);
  }

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ SuperAdmin (${email}) はすでに存在します`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.superAdmin.create({
    data: { email, passwordHash },
  });

  console.log(`✅ SuperAdmin を作成しました`);
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
