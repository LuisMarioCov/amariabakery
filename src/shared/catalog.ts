export const FLAVORS = [
  { id: "chispas", name: "Chispas", group: "Clásicas" },
  { id: "smores", name: "S'mores", group: "Clásicas" },
  { id: "lotus", name: "Lotus", group: "Clásicas" },
  { id: "manzana", name: "Manzana", group: "Clásicas" },
  { id: "chunky-monkey", name: "Chunky monkey", group: "Temporada" },
  { id: "naranja-chocolate", name: "Naranja chocolate", group: "Temporada" },
] as const;

export type FlavorId = (typeof FLAVORS)[number]["id"];

const FLAVOR_IDS = new Set<string>(FLAVORS.map((flavor) => flavor.id));

export function isFlavorId(value: string): value is FlavorId {
  return FLAVOR_IDS.has(value);
}

export function flavorName(id: string): string {
  return FLAVORS.find((flavor) => flavor.id === id)?.name ?? id;
}

export type ProductKind = "simple" | "cookie_box";
export type Fulfillment = "pickup" | "delivery";
export type OrderStatus = "nuevo" | "en_preparacion" | "listo";

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  photoUrl: string | null;
  kind: ProductKind;
  cookieCount: number | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  products: Product[];
};

export type OrderItemInput = {
  productId: string;
  quantity: number;
  gift?: boolean;
  flavors?: string[];
};

export type OrderItem = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  gift: boolean | null;
  flavors: string[];
  lineTotalCents: number;
};

export type Order = {
  id: string;
  publicCode: string;
  customerName: string;
  customerPhone: string;
  fulfillment: Fulfillment;
  address: string | null;
  note: string | null;
  status: OrderStatus;
  totalCents: number;
  createdAt: number;
  items: OrderItem[];
};

export function formatMoney(cents: number): string {
  const digits = String(Math.abs(Math.round(cents / 100)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${grouped}`;
}

export function formatFlavorCounts(ids: string[]): string {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => `${flavorName(id)} × ${count}`).join(", ");
}

export function fulfillmentLabel(fulfillment: Fulfillment): string {
  return fulfillment === "pickup" ? "Recoger en el local" : "Envío";
}

export function statusLabel(status: OrderStatus): string {
  if (status === "nuevo") return "Nuevo";
  if (status === "en_preparacion") return "En preparación";
  return "Listo";
}

export function buildWhatsappMessage(input: {
  customerName: string;
  customerPhone: string;
  fulfillment: Fulfillment;
  address: string | null;
  note: string | null;
  publicCode: string;
  totalCents: number;
  items: OrderItem[];
}): string {
  const lines = [
    `Hola, soy ${input.customerName}. Quiero hacer un pedido.`,
    "",
    ...input.items.flatMap((item) => {
      const row = [
        `- ${item.quantity} × ${item.productName} — ${formatMoney(item.lineTotalCents)}`,
      ];
      if (item.gift !== null) {
        row.push(`  Regalo: ${item.gift ? "sí" : "no"}`);
      }
      if (item.flavors.length > 0) {
        row.push(`  Sabores: ${formatFlavorCounts(item.flavors)}`);
      }
      return row;
    }),
    "",
    `Total: ${formatMoney(input.totalCents)}`,
    input.fulfillment === "delivery" && input.address
      ? `Envío a: ${input.address}`
      : "Entrega: recoger en el local",
    `Teléfono: ${input.customerPhone}`,
  ];
  if (input.note) lines.push(`Nota: ${input.note}`);
  lines.push(
    "",
    input.fulfillment === "delivery"
      ? "Pago por transferencia. Envío el comprobante junto con este pedido."
      : "Pago en efectivo o transferencia al recoger.",
    `Folio: ${input.publicCode}`,
  );
  return lines.join("\n");
}

export function whatsappUrl(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}
