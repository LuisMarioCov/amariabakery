import { signValue, timingSafeEqual } from "./crypto";
import { HttpError } from "./errors";

export async function issueTicketToken(secret: string | undefined, orderId: string): Promise<string> {
  if (!secret || secret.length < 32) throw new HttpError(500, "No se pudo preparar el ticket");
  const mac = await signValue(secret, `ticket:${orderId}`);
  return `${orderId}.${mac}`;
}

export async function readTicketOrderId(secret: string | undefined, token: string): Promise<string | null> {
  if (!secret || secret.length < 32) return null;
  const dot = token.indexOf(".");
  if (dot !== 36) return null;
  const orderId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || mac.length < 20) return null;
  const expected = await signValue(secret, `ticket:${orderId}`);
  if (!timingSafeEqual(mac, expected)) return null;
  return orderId;
}
