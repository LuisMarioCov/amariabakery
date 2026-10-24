import {
  buildWhatsappMessage,
  isFlavorId,
  whatsappUrl,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "../shared/catalog";
import { HttpError } from "./errors";
import { getProduct } from "./menu";
import { deliveryAddress, orderSchema } from "./schemas";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function publicCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

type OrderRow = {
  id: string;
  public_code: string;
  customer_name: string;
  customer_phone: string;
  fulfillment: "pickup" | "delivery";
  address: string | null;
  note: string | null;
  status: OrderStatus;
  total_cents: number;
  created_at: number;
};

type ItemRow = {
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  gift: number | null;
  flavors: string | null;
  line_total_cents: number;
};

export async function createOrder(db: D1Database, body: unknown, whatsappPhone: string) {
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Revisa los datos del pedido");
  }
  const input = parsed.data;
  const address = deliveryAddress(input.fulfillment, input.address);
  const note = input.note?.trim() ? input.note.trim() : null;
  const items: OrderItem[] = [];
  let total = 0;

  for (const item of input.items) {
    const product = await getProduct(db, item.productId);
    if (!product || product.available !== 1) {
      throw new HttpError(400, "Un producto del pedido ya no está disponible");
    }
    if (product.kind === "cookie_box") {
      const flavors = item.flavors ?? [];
      const expected = (product.cookie_count ?? 0) * item.quantity;
      if (typeof item.gift !== "boolean" || flavors.length !== expected || flavors.some((flavor) => !isFlavorId(flavor))) {
        throw new HttpError(400, `Elige ${expected} galletas y si la caja es para regalo`);
      }
    } else if (item.gift !== undefined || (item.flavors?.length ?? 0) > 0) {
      throw new HttpError(400, "Ese producto no lleva sabores ni opción de regalo");
    }
    const lineTotal = product.price_cents * item.quantity;
    total += lineTotal;
    items.push({
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.price_cents,
      quantity: item.quantity,
      gift: product.kind === "cookie_box" ? Boolean(item.gift) : null,
      flavors: product.kind === "cookie_box" ? (item.flavors ?? []) : [],
      lineTotalCents: lineTotal,
    });
  }

  const orderId = crypto.randomUUID();
  const code = publicCode();
  const createdAt = Date.now();
  const statements = [
    db
      .prepare(
        `INSERT INTO orders (
          id, public_code, customer_name, customer_phone, fulfillment, address, note, status, total_cents, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?)`,
      )
      .bind(orderId, code, input.customerName, input.customerPhone.trim(), input.fulfillment, address, note, total, createdAt),
    ...items.map((item) =>
      db
        .prepare(
          `INSERT INTO order_items (
            id, order_id, product_id, product_name, unit_price_cents, quantity, gift, flavors, line_total_cents
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          orderId,
          item.productId,
          item.productName,
          item.unitPriceCents,
          item.quantity,
          item.gift === null ? null : item.gift ? 1 : 0,
          item.flavors.length > 0 ? JSON.stringify(item.flavors) : null,
          item.lineTotalCents,
        ),
    ),
  ];
  await db.batch(statements);

  const message = buildWhatsappMessage({
    customerName: input.customerName,
    customerPhone: input.customerPhone.trim(),
    fulfillment: input.fulfillment,
    address,
    note,
    publicCode: code,
    totalCents: total,
    items,
  });

  return {
    id: orderId,
    publicCode: code,
    totalCents: total,
    whatsappUrl: whatsappUrl(whatsappPhone, message),
  };
}

export async function listOrders(db: D1Database): Promise<Order[]> {
  const orders = await db
    .prepare(
      `SELECT id, public_code, customer_name, customer_phone, fulfillment, address, note, status, total_cents, created_at
       FROM orders ORDER BY created_at DESC LIMIT 100`,
    )
    .all<OrderRow>();
  if (orders.results.length === 0) return [];
  const items = await db
    .prepare(
      `SELECT order_id, product_id, product_name, unit_price_cents, quantity, gift, flavors, line_total_cents
       FROM order_items WHERE order_id IN (${orders.results.map(() => "?").join(",")})`,
    )
    .bind(...orders.results.map((order) => order.id))
    .all<ItemRow>();
  return orders.results.map((order) => ({
    id: order.id,
    publicCode: order.public_code,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    fulfillment: order.fulfillment,
    address: order.address,
    note: order.note,
    status: order.status,
    totalCents: order.total_cents,
    createdAt: order.created_at,
    items: items.results
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
        gift: item.gift === null ? null : item.gift === 1,
        flavors: item.flavors ? (JSON.parse(item.flavors) as string[]) : [],
        lineTotalCents: item.line_total_cents,
      })),
  }));
}

export async function updateOrderStatus(db: D1Database, id: string, status: OrderStatus): Promise<void> {
  const result = await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "No encontramos ese pedido");
}
