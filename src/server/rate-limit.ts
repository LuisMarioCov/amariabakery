import { HttpError } from "./errors";

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ORDER_LIMIT = 12;
const ORDER_WINDOW_MS = 60 * 60 * 1000;

export function clientAddress(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local";
}

export async function assertRateLimit(
  db: D1Database,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const windowStart = now - (now % windowMs);
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count)
       VALUES (?, ?, 1)
       ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(bucket, windowStart)
    .first<{ count: number }>();
  if ((row?.count ?? 1) > limit) {
    throw new HttpError(429, "Demasiados intentos. Espera un momento e inténtalo de nuevo.");
  }
}

export function assertLoginRate(db: D1Database, request: Request): Promise<void> {
  return assertRateLimit(db, `login:${clientAddress(request)}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export function assertOrderRate(db: D1Database, request: Request): Promise<void> {
  return assertRateLimit(db, `order:${clientAddress(request)}`, ORDER_LIMIT, ORDER_WINDOW_MS);
}
