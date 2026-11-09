import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { orderDates, orderTimes } from "../src/shared/catalog";
import app from "../src/server/index";
import type { D1Migration } from "@cloudflare/vitest-plugin";

type TestEnv = Cloudflare.Env & {
  TEST_MIGRATIONS: D1Migration[];
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
};

const testEnv = env as TestEnv;

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
});

function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type") && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  if (init?.method && init.method !== "GET") {
    headers.set("origin", "https://amaria.test");
  }
  return app.fetch(new Request(`https://amaria.test${path}`, { ...init, headers }), testEnv);
}

function schedule() {
  const date = orderDates()[0]?.date ?? "";
  const time = orderTimes(date)[0] ?? "";
  return { scheduledDate: date, scheduledTime: time };
}

function mexicoDate(offsetDays: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const shifted = new Date(Date.UTC(Number(value("year")), Number(value("month")) - 1, Number(value("day")) + offsetDays, 18, 0));
  const next = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(shifted);
  const part = (type: string) => next.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function login(ip = "203.0.113.10"): Promise<string> {
  const response = await request("/api/admin/login", {
    method: "POST",
    headers: { "CF-Connecting-IP": ip },
    body: JSON.stringify({ password: "test-password-amaria" }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=Lax");
  return cookie.split(";")[0] ?? "";
}

describe("menú público", () => {
  it("muestra los postres del PDF y omite categorías vacías", async () => {
    const response = await request("/api/menu");
    expect(response.status).toBe(200);
    const body = await response.json<{ categories: { slug: string; products: { id: string; priceCents: number }[] }[] }>();
    expect(body.categories.map((category) => category.slug)).toEqual(["postres"]);
    const ids = body.categories[0]?.products.map((product) => product.id);
    expect(ids).toEqual([
      "pastel-zanahoria",
      "panque-platano",
      "bruce-cake",
      "tarta-tiramisu",
      "cheesecake-limon",
      "cheesecake-fresa",
      "caja-3-galletas",
      "caja-6-galletas",
    ]);
    expect(body.categories[0]?.products.find((product) => product.id === "bruce-cake")?.priceCents).toBe(75000);
  });
});

describe("pedidos", () => {
  it("rechaza un precio enviado por el cliente", async () => {
    const response = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.20" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        address: "no debe guardarse",
        priceCents: 1,
        items: [{ productId: "pastel-zanahoria", quantity: 2 }],
      }),
    });
    expect(response.status).toBe(400);
  });

  it("guarda recoger en el local y abre WhatsApp", async () => {
    const response = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.21" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "pastel-zanahoria", quantity: 1 }],
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json<{ totalCents: number; whatsappUrl: string; publicCode: string }>();
    expect(body.totalCents).toBe(48000);
    expect(body.whatsappUrl).toContain("https://wa.me/5213123769977");
    const message = decodeURIComponent(body.whatsappUrl.split("text=")[1] ?? "");
    expect(message).toContain("Quiero este pedido para el");
    expect(message).toContain("Pastel de zanahoria");
    expect(message).toContain("$480");
    expect(message).toContain("Lo recojo en el local. Anticipo del 50% ($240) por transferencia. El resto se paga al recoger. Adjunto el comprobante.");
    expect(message).toContain("Teléfono: 3121234567");
    expect(message).toContain(`Folio: ${body.publicCode}`);
    expect(message).not.toContain("https://www.google.com/maps/search/");
    expect(message).not.toContain("no debe guardarse");
  });

  it("rechaza un teléfono que no tiene 10 dígitos", async () => {
    for (const customerPhone of ["312123456", "31212345678", "312 123 4567"]) {
      const response = await request("/api/orders", {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.70" },
        body: JSON.stringify({
          ...schedule(),
          customerName: "Ana López",
          customerPhone,
          fulfillment: "pickup",
          payment: "transferencia",
          items: [{ productId: "pastel-zanahoria", quantity: 1 }],
        }),
      });
      expect(response.status).toBe(400);
      const body = await response.json<{ error: string }>();
      expect(body.error).toBe("Escribe un teléfono de 10 dígitos");
    }
  });

  it("rechaza una hora fuera del horario", async () => {
    const response = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.27" },
      body: JSON.stringify({
        ...schedule(),
        scheduledTime: "15:00",
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "pastel-zanahoria", quantity: 1 }],
      }),
    });
    expect(response.status).toBe(400);
  });

  it("cobra dos pasteles al precio del menú", async () => {
    const response = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.91" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "pastel-zanahoria", quantity: 2 }],
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json<{ totalCents: number; whatsappUrl: string }>();
    expect(body.totalCents).toBe(96000);
    expect(decodeURIComponent(body.whatsappUrl)).toContain("2 × Pastel de zanahoria — $960");
  });

  it("solo acepta recoger en el local con anticipo por transferencia", async () => {
    const dates = orderDates().map((day) => day.date);
    expect(dates[0] >= mexicoDate(2)).toBe(true);
    expect(dates).not.toContain(mexicoDate(0));
    expect(dates).not.toContain(mexicoDate(1));

    const delivered = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.22" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "delivery",
        payment: "transferencia",
        address: "Calle Reforma 12, Colima",
        items: [{ productId: "cheesecake-fresa", quantity: 1 }],
      }),
    });
    expect(delivered.status).toBe(400);
    expect((await delivered.json<{ error: string }>()).error).toBe("Por ahora solo se recogen pedidos en el local");

    const inStore = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.28" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "tienda",
        items: [{ productId: "cheesecake-fresa", quantity: 1 }],
      }),
    });
    expect(inStore.status).toBe(400);
    expect((await inStore.json<{ error: string }>()).error).toBe("El anticipo se paga por transferencia");

    const tooSoon = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.29" },
      body: JSON.stringify({
        scheduledDate: mexicoDate(1),
        scheduledTime: "10:00",
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "cheesecake-fresa", quantity: 1 }],
      }),
    });
    expect(tooSoon.status).toBe(400);
    expect((await tooSoon.json<{ error: string }>()).error).toBe("Los pedidos se recogen a partir de 2 días, en el horario del local");

    const sent = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.23" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [
          {
            productId: "caja-3-galletas",
            quantity: 1,
            gift: true,
            flavors: ["chispas", "chispas", "naranja-chocolate"],
          },
        ],
      }),
    });
    expect(sent.status).toBe(201);
    const body = await sent.json<{ whatsappUrl: string; totalCents: number }>();
    expect(body.totalCents).toBe(21000);
    const message = decodeURIComponent(body.whatsappUrl);
    expect(message).toContain("Regalo: sí");
    expect(message).toContain("Anticipo del 50% ($105) por transferencia");
    expect(message).not.toContain("Calle Reforma");
  });

  it("pide una galleta por cada lugar de cada caja", async () => {
    const short = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.92" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "caja-3-galletas", quantity: 2, gift: false, flavors: ["chispas", "lotus", "manzana"] }],
      }),
    });
    expect(short.status).toBe(400);

    const full = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.93" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [
          {
            productId: "caja-3-galletas",
            quantity: 2,
            gift: false,
            flavors: ["chispas", "chispas", "lotus", "manzana", "manzana", "naranja-chocolate"],
          },
        ],
      }),
    });
    expect(full.status).toBe(201);
    const body = await full.json<{ totalCents: number }>();
    expect(body.totalCents).toBe(42000);
  });

  it("rechaza una caja con sabores de más y un producto agotado", async () => {
    const badBox = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.24" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "caja-6-galletas", quantity: 1, gift: false, flavors: ["chispas"] }],
      }),
    });
    expect(badBox.status).toBe(400);

    const cookie = await login("203.0.113.25");
    const hidden = await request("/api/admin/products/bruce-cake", {
      method: "PATCH",
      headers: { cookie, "CF-Connecting-IP": "203.0.113.25" },
      body: JSON.stringify({ available: false }),
    });
    expect(hidden.status).toBe(200);

    const menu = await request("/api/menu");
    const body = await menu.json<{ categories: { products: { id: string }[] }[] }>();
    expect(body.categories[0]?.products.some((product) => product.id === "bruce-cake")).toBe(false);

    const order = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.26" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "bruce-cake", quantity: 1 }],
      }),
    });
    expect(order.status).toBe(400);

    await request("/api/admin/products/bruce-cake", {
      method: "PATCH",
      headers: { cookie, "CF-Connecting-IP": "203.0.113.25" },
      body: JSON.stringify({ available: true }),
    });
  });
});

describe("pantalla privada", () => {
  it("niega cambios sin sesión y limita el login", async () => {
    const denied = await request("/api/admin/products/pastel-zanahoria", {
      method: "PATCH",
      body: JSON.stringify({ priceCents: 100 }),
    });
    expect(denied.status).toBe(401);

    const wrong = await request("/api/admin/login", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.40" },
      body: JSON.stringify({ password: "incorrecta" }),
    });
    expect(wrong.status).toBe(401);

    const ip = "203.0.113.41";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request("/api/admin/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": ip },
        body: JSON.stringify({ password: "incorrecta" }),
      });
      expect(response.status).toBe(401);
    }
    const limited = await request("/api/admin/login", {
      method: "POST",
      headers: { "CF-Connecting-IP": ip },
      body: JSON.stringify({ password: "test-password-amaria" }),
    });
    expect(limited.status).toBe(429);
  });

  it("cambia el estatus del pedido", async () => {
    const created = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.50" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Luis Pérez",
        customerPhone: "3120001122",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "tarta-tiramisu", quantity: 1 }],
      }),
    });
    const order = await created.json<{ id: string }>();
    const outsider = await request(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "listo" }),
    });
    expect(outsider.status).toBe(401);

    const cookie = await login("203.0.113.51");
    const updated = await request(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ status: "en_preparacion" }),
    });
    expect(updated.status).toBe(200);
    const orders = await request("/api/admin/orders", { headers: { cookie } });
    const list = await orders.json<{ orders: { id: string; status: string }[] }>();
    expect(list.orders.find((item) => item.id === order.id)?.status).toBe("en_preparacion");

    const denied = await request(`/api/admin/orders/${order.id}`, { method: "DELETE" });
    expect(denied.status).toBe(401);
    const removed = await request(`/api/admin/orders/${order.id}`, { method: "DELETE", headers: { cookie } });
    expect(removed.status).toBe(200);
    const after = await request("/api/admin/orders", { headers: { cookie } });
    const remaining = await after.json<{ orders: { id: string }[] }>();
    expect(remaining.orders.find((item) => item.id === order.id)).toBeUndefined();
    const missing = await request(`/api/admin/orders/${order.id}`, { method: "DELETE", headers: { cookie } });
    expect(missing.status).toBe(404);
  });

  it("entrega el ticket al cliente y al admin", async () => {
    const created = await request("/api/orders", {
      method: "POST",
      headers: { "CF-Connecting-IP": "203.0.113.80" },
      body: JSON.stringify({
        ...schedule(),
        customerName: "Ana López",
        customerPhone: "3121234567",
        fulfillment: "pickup",
        payment: "transferencia",
        items: [{ productId: "pastel-zanahoria", quantity: 1 }],
      }),
    });
    expect(created.status).toBe(201);
    const body = await created.json<{ id: string; publicCode: string; ticketToken: string; whatsappUrl: string }>();
    expect(body.ticketToken.startsWith(`${body.id}.`)).toBe(true);
    expect(decodeURIComponent(body.whatsappUrl)).toContain("Quiero este pedido para el");
    expect(decodeURIComponent(body.whatsappUrl)).not.toContain(`/pedido/${body.ticketToken}`);

    const ticket = await request(`/api/tickets/${body.ticketToken}`, {
      headers: { "CF-Connecting-IP": "203.0.113.81" },
    });
    expect(ticket.status).toBe(200);
    const shown = await ticket.json<{ publicCode: string; id?: string }>();
    expect(shown.publicCode).toBe(body.publicCode);
    expect(shown.id).toBeUndefined();

    const pdf = await request(`/api/tickets/${body.ticketToken}/pdf?descarga=1`, {
      headers: { "CF-Connecting-IP": "203.0.113.82" },
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toContain("application/pdf");
    expect(pdf.headers.get("content-disposition")).toContain("attachment");
    const bytes = new TextDecoder().decode(await pdf.arrayBuffer());
    expect(bytes.startsWith("%PDF-")).toBe(true);
    expect(bytes).toContain(body.publicCode);

    const missing = await request("/api/tickets/no-es-un-ticket", {
      headers: { "CF-Connecting-IP": "203.0.113.83" },
    });
    expect(missing.status).toBe(404);

    const locked = await request(`/api/admin/orders/${body.id}/pdf`);
    expect(locked.status).toBe(401);

    const cookie = await login("203.0.113.84");
    const adminPdf = await request(`/api/admin/orders/${body.id}/pdf`, { headers: { cookie } });
    expect(adminPdf.status).toBe(200);
    const adminBytes = new TextDecoder().decode(await adminPdf.arrayBuffer());
    expect(adminBytes.startsWith("%PDF-")).toBe(true);
    expect(adminBytes).toContain(body.publicCode);

    const unknown = await request(`/api/admin/orders/00000000-0000-4000-8000-000000000000/pdf`, { headers: { cookie } });
    expect(unknown.status).toBe(404);
  });

  it("rechaza otro origen", async () => {
    const response = await app.fetch(
      new Request("https://amaria.test/api/orders", {
        method: "POST",
        headers: { origin: "https://otro.example", "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      testEnv,
    );
    expect(response.status).toBe(403);
  });

  it("crea una categoría y publica una foto webp", async () => {
    const cookie = await login("203.0.113.70");
    const created = await request("/api/admin/categories", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ name: "Bebidas" }),
    });
    expect(created.status).toBe(201);

    const bytes = Uint8Array.from(atob("UklGRjAAAABXRUJQVlA4ICQAAABwAQCdASoIAAgAA4BaJYgCdAFAAAD+4uCK0V0v31wtlk4AAAA="), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.set("photo", new File([bytes], "foto.webp", { type: "image/webp" }));
    const uploaded = await request("/api/admin/products/pastel-zanahoria/photo", {
      method: "POST",
      headers: { cookie, "CF-Connecting-IP": "203.0.113.71" },
      body: form,
    });
    expect(uploaded.status).toBe(200);
    const body = await uploaded.json<{ photoUrl: string }>();
    const media = await request(body.photoUrl);
    expect(media.status).toBe(200);
    expect(media.headers.get("content-type")).toBe("image/webp");
    const stored = new Uint8Array(await media.arrayBuffer());
    expect(Array.from(stored)).toEqual(Array.from(bytes));
  });
});
