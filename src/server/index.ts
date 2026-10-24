import { Hono } from "hono";
import { assertSameOrigin, clearSessionCookie, isAdmin, login, requireAdmin, sessionCookie } from "./auth";
import { HttpError, securityHeaders } from "./errors";
import { getProduct, getProductByPhoto, listCategories, slugify } from "./menu";
import { createOrder, listOrders, updateOrderStatus } from "./orders";
import { assertLoginRate, assertOrderRate } from "./rate-limit";
import { categorySchema, loginSchema, productPatchSchema, productSchema, statusSchema } from "./schemas";

export type Env = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  WHATSAPP_E164: string;
  INSTAGRAM_HANDLE: string;
};

const MAX_PHOTO_BYTES = 1_200_000;

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  await next();
  const headers = securityHeaders();
  headers.forEach((value, key) => {
    if (!c.res.headers.has(key)) c.res.headers.set(key, value);
  });
});

app.onError((error, c) => {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status as 400);
  }
  console.error(JSON.stringify({ event: "unhandled", message: error instanceof Error ? error.message : "error" }));
  return c.json({ error: "No se pudo completar la solicitud" }, 500);
});

app.get("/api/menu", async (c) => {
  const categories = await listCategories(c.env.DB, true);
  return c.json({ categories, instagram: c.env.INSTAGRAM_HANDLE, whatsapp: c.env.WHATSAPP_E164 });
});

app.post("/api/orders", async (c) => {
  assertSameOrigin(c.req.raw);
  await assertOrderRate(c.env.DB, c.req.raw);
  const body: unknown = await c.req.json();
  const order = await createOrder(c.env.DB, body, c.env.WHATSAPP_E164);
  return c.json(order, 201);
});

app.get("/api/media/:key", async (c) => {
  const key = c.req.param("key");
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new HttpError(404, "No encontramos esa foto");
  const product = await getProductByPhoto(c.env.DB, key);
  if (!product) throw new HttpError(404, "No encontramos esa foto");
  if (product.available !== 1 && !(await isAdmin(c.req.raw, c.env.SESSION_SECRET))) {
    throw new HttpError(404, "No encontramos esa foto");
  }
  const object = await c.env.PHOTOS.get(key);
  if (!object) throw new HttpError(404, "No encontramos esa foto");
  const headers = new Headers({
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": product.available === 1 ? "public, max-age=86400" : "private, no-store",
  });
  return new Response(object.body, { headers });
});

app.post("/api/admin/login", async (c) => {
  assertSameOrigin(c.req.raw);
  await assertLoginRate(c.env.DB, c.req.raw);
  const parsed = loginSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(401, "No se pudo iniciar sesión");
  await login(c.env.DB, parsed.data.password, c.env.ADMIN_PASSWORD);
  const cookie = await sessionCookie(c.env.SESSION_SECRET, c.req.raw);
  c.header("Set-Cookie", cookie);
  return c.json({ ok: true });
});

app.post("/api/admin/logout", async (c) => {
  assertSameOrigin(c.req.raw);
  c.header("Set-Cookie", clearSessionCookie(c.req.raw));
  return c.json({ ok: true });
});

app.get("/api/admin/session", async (c) => {
  return c.json({ ok: await isAdmin(c.req.raw, c.env.SESSION_SECRET) });
});

app.get("/api/admin/catalog", async (c) => {
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  return c.json({ categories: await listCategories(c.env.DB, false) });
});

app.get("/api/admin/orders", async (c) => {
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  return c.json({ orders: await listOrders(c.env.DB) });
});

app.patch("/api/admin/orders/:id", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const parsed = statusSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, "Estatus no válido");
  await updateOrderStatus(c.env.DB, c.req.param("id"), parsed.data.status);
  return c.json({ ok: true });
});

app.post("/api/admin/categories", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const parsed = categorySchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, "Revisa el nombre de la categoría");
  const id = slugify(parsed.data.name);
  const sort = await c.env.DB.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories").first<{ next: number }>();
  try {
    await c.env.DB
      .prepare("INSERT INTO categories (id, name, slug, sort_order) VALUES (?, ?, ?, ?)")
      .bind(id, parsed.data.name, id, sort?.next ?? 1)
      .run();
  } catch (error) {
    console.error(JSON.stringify({ event: "category_insert", message: error instanceof Error ? error.message : "error" }));
    throw new HttpError(400, "Esa categoría ya existe");
  }
  return c.json({ id }, 201);
});

app.post("/api/admin/products", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const parsed = productSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Revisa el producto");
  const category = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(parsed.data.categoryId).first();
  if (!category) throw new HttpError(400, "Esa categoría no existe");
  const id = `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const sort = await c.env.DB
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM products WHERE category_id = ?")
    .bind(parsed.data.categoryId)
    .first<{ next: number }>();
  await c.env.DB
    .prepare(
      `INSERT INTO products (
        id, category_id, name, description, price_cents, available, photo_key, kind, cookie_count, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      parsed.data.categoryId,
      parsed.data.name,
      parsed.data.description,
      parsed.data.priceCents,
      parsed.data.available ? 1 : 0,
      parsed.data.kind,
      parsed.data.kind === "cookie_box" ? parsed.data.cookieCount : null,
      sort?.next ?? 1,
      now,
      now,
    )
    .run();
  return c.json({ id }, 201);
});

app.patch("/api/admin/products/:id", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const current = await getProduct(c.env.DB, c.req.param("id"));
  if (!current) throw new HttpError(404, "No encontramos ese producto");
  const parsed = productPatchSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Revisa el producto");
  const next = {
    categoryId: parsed.data.categoryId ?? current.category_id,
    name: parsed.data.name ?? current.name,
    description: parsed.data.description ?? current.description,
    priceCents: parsed.data.priceCents ?? current.price_cents,
    available: parsed.data.available ?? current.available === 1,
    kind: parsed.data.kind ?? current.kind,
    cookieCount: parsed.data.cookieCount === undefined ? current.cookie_count : parsed.data.cookieCount,
  };
  const checked = productSchema.safeParse(next);
  if (!checked.success) throw new HttpError(400, checked.error.issues[0]?.message ?? "Revisa el producto");
  if (parsed.data.categoryId) {
    const category = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(parsed.data.categoryId).first();
    if (!category) throw new HttpError(400, "Esa categoría no existe");
  }
  await c.env.DB
    .prepare(
      `UPDATE products
       SET category_id = ?, name = ?, description = ?, price_cents = ?, available = ?, kind = ?, cookie_count = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      checked.data.categoryId,
      checked.data.name,
      checked.data.description,
      checked.data.priceCents,
      checked.data.available ? 1 : 0,
      checked.data.kind,
      checked.data.kind === "cookie_box" ? checked.data.cookieCount : null,
      Date.now(),
      current.id,
    )
    .run();
  return c.json({ ok: true });
});

app.delete("/api/admin/products/:id", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const current = await getProduct(c.env.DB, c.req.param("id"));
  if (!current) throw new HttpError(404, "No encontramos ese producto");
  await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(current.id).run();
  if (current.photo_key) await c.env.PHOTOS.delete(current.photo_key);
  return c.json({ ok: true });
});

app.post("/api/admin/products/:id/photo", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const current = await getProduct(c.env.DB, c.req.param("id"));
  if (!current) throw new HttpError(404, "No encontramos ese producto");
  const form = await c.req.formData();
  const file = form.get("photo");
  if (!isUploadedFile(file)) throw new HttpError(400, "Falta la foto");
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) throw new HttpError(400, "La foto debe pesar menos de 1.2 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isWebp(bytes)) throw new HttpError(400, "La foto tiene que estar en WebP");
  const key = crypto.randomUUID();
  await c.env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });
  await c.env.DB.prepare("UPDATE products SET photo_key = ?, updated_at = ? WHERE id = ?").bind(key, Date.now(), current.id).run();
  if (current.photo_key) await c.env.PHOTOS.delete(current.photo_key);
  return c.json({ photoUrl: `/api/media/${key}` });
});

app.delete("/api/admin/products/:id/photo", async (c) => {
  assertSameOrigin(c.req.raw);
  await requireAdmin(c.req.raw, c.env.SESSION_SECRET);
  const current = await getProduct(c.env.DB, c.req.param("id"));
  if (!current) throw new HttpError(404, "No encontramos ese producto");
  await c.env.DB.prepare("UPDATE products SET photo_key = NULL, updated_at = ? WHERE id = ?").bind(Date.now(), current.id).run();
  if (current.photo_key) await c.env.PHOTOS.delete(current.photo_key);
  return c.json({ ok: true });
});

app.all("*", () => new Response(null, { status: 404 }));

function isUploadedFile(value: unknown): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "size" in value;
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export default app;
