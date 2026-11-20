import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { cache } from 'react';
import { prisma } from './prisma';

export type UserRole = 'tenant_admin' | 'store_staff';

export interface AuthPayload {
  userId: string;
  tenantId: string;
  storeId: string | null;   // null = tenant_admin（全店舗アクセス可）
  role: UserRole;
  email: string;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

/** JWTを発行 */
export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

/** JWTを検証してペイロードを返す */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * JWTの中身が今もDBと一致しているかを確かめる。
 * 削除されたユーザー、役割・担当店舗の変更、パスワード変更前に発行されたログインを無効にする。
 */
async function confirmAuth(payload: AuthPayload & { iat?: number }): Promise<AuthPayload | null> {
  if (payload.tenantId === '__super__') {
    const admin = await prisma.superAdmin.findUnique({ where: { id: payload.userId }, select: { id: true } });
    return admin ? payload : null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      tenantId: true,
      role: true,
      updatedAt: true,
      storeUsers: { select: { storeId: true } },
      tenant: { select: { stores: { where: { id: payload.storeId ?? '' }, select: { id: true } } } },
    },
  });
  if (!user || user.tenantId !== payload.tenantId || user.role !== payload.role) return null;
  // パスワード変更などでユーザーが更新された後は、それ以前に発行したログインを無効にする
  if (typeof payload.iat === 'number' && Math.floor(user.updatedAt.getTime() / 1000) > payload.iat) return null;
  if (payload.storeId) {
    const allowed = payload.role === 'store_staff'
      ? user.storeUsers.some((entry) => entry.storeId === payload.storeId)
      : user.tenant.stores.length === 1;
    if (!allowed) return null;
  }
  return payload;
}

async function authFromToken(token: string | undefined): Promise<AuthPayload | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload ? confirmAuth(payload) : null;
}

/** リクエストからAuthPayloadを取得（APIルート用） */
export async function getAuth(req: NextRequest): Promise<AuthPayload | null> {
  return authFromToken(req.cookies.get('auth-token')?.value);
}

/** Server Component / Server Action からAuthPayloadを取得（同じリクエスト内では1回だけDB確認） */
export const getServerAuth = cache(async (): Promise<AuthPayload | null> => {
  const cookieStore = await cookies();
  return authFromToken(cookieStore.get('auth-token')?.value);
});

/** オーナー（tenant_admin）以外を拒否する。削除・マスタ変更などに使う */
export function isOwner(auth: AuthPayload | null): boolean {
  return auth?.role === 'tenant_admin' && auth.tenantId !== '__super__';
}

/** 新規登録の受付。SIGNUP_ENABLED=true のときだけ開く（既定は停止） */
export function isSignupEnabled(): boolean {
  return process.env.SIGNUP_ENABLED === 'true';
}

/** トライアル上限（後方互換のため残す） */
export const TRIAL_LIMITS = {
  menuItems: 10,
  ingredients: 20,
} as const;

/** テナントが有料プラン（または制限なし）かどうか */
export function isPaidPlan(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === 'active';
}
