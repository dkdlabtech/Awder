import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RateLimitOptions {
  /** Identifier (IP, uid, phone, etc.) */
  key: string;
  /** Bucket name, e.g. "whatsapp_send" */
  bucket: string;
  /** Maximum allowed hits within the window */
  max: number;
  /** Window duration in seconds */
  windowSec: number;
}

/**
 * Distributed rate limiter backed by Firestore.
 * Stores doc at rateLimits/{bucket}_{key} with { count, resetAt }.
 *
 * Returns { allowed, retryAfterMs }.
 */
export async function checkRateLimit({
  key,
  bucket,
  max,
  windowSec,
}: RateLimitOptions): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docId = `${bucket}_${safeKey}`;
  const ref = adminDb().collection('rateLimits').doc(docId);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data()! : null;

    if (!data || (data.resetAt?.toMillis?.() ?? 0) <= now) {
      // New window
      tx.set(ref, {
        count: 1,
        resetAt: FieldValue.serverTimestamp(),
        windowSec,
        bucket,
      });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (data.count >= max) {
      const retryAfterMs = (data.resetAt.toMillis() + windowSec * 1000) - now;
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    tx.update(ref, { count: FieldValue.increment(1) });
    return { allowed: true, retryAfterMs: 0 };
  });
}

/** Extracts the client IP from a Next.js request (best-effort). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
