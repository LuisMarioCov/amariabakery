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
export type PaymentMethod = "tienda" | "transferencia";
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
  scheduledDate: string | null;
  scheduledTime: string | null;
  paymentMethod: PaymentMethod | null;
  status: OrderStatus;
  totalCents: number;
  createdAt: number;
  items: OrderItem[];
  ticketToken?: string;
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

export const STORE_ADDRESS = "Calle Ignacio Sandoval 1902-Loc C, Las Pergolas, 28018 Colima, Col.";

export const STORE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_ADDRESS)}`;

export const STORE_HOURS = "Lunes a sábado: 8:00 a. m.–1:30 p. m. y 4:30 p. m.–9:30 p. m. Domingos: descanso.";

const STORE_TIME_ZONE = "America/Mexico_City";

export function storeStatus(now = new Date()): { open: boolean; label: "Abierto" | "Cerrado" } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (weekday === "Sun" || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { open: false, label: "Cerrado" };
  }
  const minutes = (hour % 24) * 60 + minute;
  const open = (minutes >= 8 * 60 && minutes < 13 * 60 + 30) || (minutes >= 16 * 60 + 30 && minutes < 21 * 60 + 30);
  return open ? { open: true, label: "Abierto" } : { open: false, label: "Cerrado" };
}

const ORDER_WINDOWS: [number, number][] = [
  [8 * 60, 13 * 60 + 30],
  [16 * 60 + 30, 21 * 60 + 30],
];
const ORDER_HORIZON_DAYS = 14;

function cityClock(now: Date): { date: string; weekday: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday"),
    minutes: (hour % 24) * 60 + minute,
  };
}

function cityDate(year: number, month: number, day: number): string {
  const instant = new Date(Date.UTC(year, month - 1, day, 18, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return cityDate(year, month, day + days);
}

function weekdayOf(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: STORE_TIME_ZONE, weekday: "short" }).format(new Date(Date.UTC(year, month - 1, day, 18, 0)));
}

function clockLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function orderTimes(date: string, now = new Date()): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const today = cityClock(now);
  const last = shiftDate(today.date, ORDER_HORIZON_DAYS - 1);
  if (date < today.date || date > last || weekdayOf(date) === "Sun") return [];
  const times: string[] = [];
  for (const [start, end] of ORDER_WINDOWS) {
    for (let minute = start; minute < end; minute += 30) {
      if (date === today.date && minute <= today.minutes) continue;
      times.push(clockLabel(minute));
    }
  }
  return times;
}

export function orderDates(now = new Date()): { date: string; label: string }[] {
  const today = cityClock(now).date;
  const dates: { date: string; label: string }[] = [];
  for (let offset = 0; offset < ORDER_HORIZON_DAYS; offset += 1) {
    const date = shiftDate(today, offset);
    if (orderTimes(date, now).length === 0) continue;
    dates.push({ date, label: formatScheduleDate(date) });
  }
  return dates;
}

export function isOrderSlot(date: string, time: string, now = new Date()): boolean {
  return orderTimes(date, now).includes(time);
}

export function formatScheduleDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 18, 0)));
}

export function formatScheduleTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(Date.UTC(2026, 0, 1, hour + 6, minute)));
}

export function formatSchedule(date: string, time: string): string {
  return `${formatScheduleDate(date)}, ${formatScheduleTime(time)}`;
}

export function fulfillmentLabel(fulfillment: Fulfillment): string {
  return fulfillment === "pickup" ? "Recoger en el local" : "Envío";
}

export function statusLabel(status: OrderStatus): string {
  if (status === "nuevo") return "Nuevo";
  if (status === "en_preparacion") return "En preparación";
  return "Listo";
}

export function paymentSentence(payment: PaymentMethod | null, fulfillment: Fulfillment): string {
  if (payment === "tienda") return "Pago en tienda.";
  if (payment === "transferencia") return "Pago por transferencia. Adjunto el comprobante.";
  return fulfillment === "delivery"
    ? "Pago por transferencia. Adjunto el comprobante."
    : "Pago en efectivo o transferencia al recoger.";
}

export function buildWhatsappMessage(input: {
  customerName: string;
  customerPhone: string;
  fulfillment: Fulfillment;
  address: string | null;
  note: string | null;
  scheduledDate: string;
  scheduledTime: string;
  payment: PaymentMethod;
  publicCode: string;
  totalCents: number;
  items: OrderItem[];
}): string {
  const when = formatSchedule(input.scheduledDate, input.scheduledTime).replace(/^\p{L}/u, (letter) => letter.toUpperCase());
  const lines = [
    `Hola, soy ${input.customerName}. Quiero este pedido para el ${when}.`,
    "",
    ...input.items.flatMap((item) => {
      const row = [`${item.quantity} × ${item.productName} — ${formatMoney(item.lineTotalCents)}`];
      if (item.gift !== null) row.push(`Regalo: ${item.gift ? "sí" : "no"}`);
      if (item.flavors.length > 0) row.push(`Sabores: ${formatFlavorCounts(item.flavors)}`);
      return row;
    }),
    "",
    `Total: ${formatMoney(input.totalCents)}`,
    "",
    input.fulfillment === "delivery" && input.address
      ? `Envío a: ${input.address}. ${paymentSentence(input.payment, input.fulfillment)}`
      : `Lo recojo en el local. ${paymentSentence(input.payment, input.fulfillment)}`,
  ];
  if (input.note) lines.push(`Nota: ${input.note}`);
  lines.push(`Teléfono: ${input.customerPhone}`, `Folio: ${input.publicCode}`);
  return lines.join("\n");
}

export function ticketLines(order: Order): string[] {
  const when = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(order.createdAt));
  const lines = [
    "Amaria Bakery",
    "Ticket de pedido",
    "",
    `Folio: ${order.publicCode}`,
    `Fecha: ${when}`,
    `Estado: ${ticketStatus(order.status)}`,
    "",
    `Cliente: ${order.customerName}`,
    `Telefono: ${order.customerPhone}`,
    order.fulfillment === "delivery" && order.address
      ? `Envio a: ${order.address}`
      : `Entrega: recoger en el local. ${ticketText(STORE_ADDRESS)} ${STORE_MAPS_URL}`,
    ...(order.fulfillment === "pickup" ? [`Horario: ${ticketText(STORE_HOURS)}`] : []),
    ...(order.scheduledDate && order.scheduledTime ? [`Para: ${ticketText(formatSchedule(order.scheduledDate, order.scheduledTime))}`] : []),
    "",
  ];
  for (const item of order.items) {
    lines.push(`${item.quantity} x ${item.productName}  ${formatMoney(item.lineTotalCents)}`);
    if (item.gift !== null) lines.push(`   Regalo: ${item.gift ? "si" : "no"}`);
    if (item.flavors.length > 0) lines.push(`   ${formatFlavorCounts(item.flavors).replaceAll("×", "x")}`);
  }
  lines.push("", `Total: ${formatMoney(order.totalCents)}`);
  lines.push(ticketText(paymentSentence(order.paymentMethod, order.fulfillment)));
  if (order.note) lines.push(`Nota: ${order.note}`);
  return lines.flatMap((line) => wrapTicketLine(line, 72));
}

function ticketText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function ticketStatus(status: OrderStatus): string {
  if (status === "nuevo") return "Nuevo";
  if (status === "en_preparacion") return "En preparacion";
  return "Listo";
}

function wrapTicketLine(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const parts: string[] = [];
  let rest = line;
  while (rest.length > width) {
    const cut = rest.lastIndexOf(" ", width);
    const at = cut > 0 ? cut : width;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  parts.push(rest);
  return parts;
}

export function whatsappUrl(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}
