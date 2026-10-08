import { jwtVerify } from 'jose';
import type { UserSession } from '@/types/auth';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'super-secret-school-ms-jwt-token-key-2026-production-ready';

const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifySessionToken(
  token: string
): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as unknown as UserSession;
  } catch (error) {
    console.log(
      'JWT VERIFY ERROR:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
