import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

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

/** リクエストからAuthPayloadを取得（APIルート用） */
export async function getAuth(req: NextRequest): Promise<AuthPayload | null> {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Server Component / Server Action からAuthPayloadを取得 */
export async function getServerAuth(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** トライアル上限 */
export const TRIAL_LIMITS = {
  menuItems: 10,
  ingredients: 20,
} as const;

/** テナントが有料プラン（または制限なし）かどうか */
export function isPaidPlan(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === 'active';
}
