import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function databaseUrlWithConnectTimeout(value: string | undefined): string | undefined {
  if (!value) return value;

  try {
    const url = new URL(value);
    if (
      (url.protocol === 'postgresql:' || url.protocol === 'postgres:') &&
      url.hostname.endsWith('.neon.tech') &&
      !url.searchParams.has('connect_timeout')
    ) {
      // Neonの休止解除を待つ。明示された設定値は変更しない。
      url.searchParams.set('connect_timeout', '15');
      return url.toString();
    }
  } catch {
    // 不正な接続文字列は従来どおりPrismaに検証させる。
  }

  return value;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: databaseUrlWithConnectTimeout(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
