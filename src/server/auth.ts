import { hashPassword, hexToBytes, randomHex, signValue, timingSafeEqual } from "./crypto";
import { HttpError } from "./errors";

const COOKIE = "amaria_session";
const SESSION_MS = 12 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 120_000;

type AdminRow = {
  id: string;
  password_hash: string;
  salt: string;
  iterations: number;
};

export async function login(db: D1Database, password: string, envPassword: string | undefined): Promise<void> {
  let admin = await db.prepare("SELECT id, password_hash, salt, iterations FROM admin_users LIMIT 1").first<AdminRow>();
  if (!admin) {
    if (!envPassword || envPassword.length < 12) {
      console.error(JSON.stringify({ event: "admin_not_configured" }));
      throw new HttpError(401, "No se pudo iniciar sesión");
    }
    const saltHex = randomHex(16);
    const passwordHash = await hashPassword(envPassword, hexToBytes(saltHex), PASSWORD_ITERATIONS);
    await db
      .prepare("INSERT INTO admin_users (id, password_hash, salt, iterations) VALUES ('admin', ?, ?, ?)")
      .bind(passwordHash, saltHex, PASSWORD_ITERATIONS)
      .run();
    admin = { id: "admin", password_hash: passwordHash, salt: saltHex, iterations: PASSWORD_ITERATIONS };
  }
  const actual = await hashPassword(password, hexToBytes(admin.salt), admin.iterations);
  if (!timingSafeEqual(actual, admin.password_hash)) {
    throw new HttpError(401, "No se pudo iniciar sesión");
  }
}

export async function sessionCookie(secret: string | undefined, request: Request): Promise<string> {
  if (!secret || secret.length < 32) {
    console.error(JSON.stringify({ event: "session_secret_missing" }));
    throw new HttpError(500, "No se pudo iniciar sesión");
  }
  const exp = Date.now() + SESSION_MS;
  const payload = `${exp}.${randomHex(16)}`;
  const signature = await signValue(secret, payload);
  const token = `${payload}.${signature}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`;
}

export function clearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export async function isAdmin(request: Request, secret: string | undefined): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const token = readCookie(request.headers.get("Cookie"), COOKIE);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, signature] = parts;
  if (!exp || !nonce || !signature) return false;
  const expected = await signValue(secret, `${exp}.${nonce}`);
  if (!timingSafeEqual(signature, expected)) return false;
  const expiresAt = Number(exp);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function requireAdmin(request: Request, secret: string | undefined): Promise<void> {
  if (!(await isAdmin(request, secret))) {
    throw new HttpError(401, "Inicia sesión para continuar");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new HttpError(403, "Origen no permitido");
  }
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}
