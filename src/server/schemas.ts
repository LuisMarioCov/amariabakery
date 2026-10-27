import { z } from "zod";
import { isFlavorId, isOrderSlot, type Fulfillment } from "../shared/catalog";

const money = z.number().int().min(0).max(10_000_000);

export const orderSchema = z
  .strictObject({
    customerName: z.string().trim().min(2).max(80),
    customerPhone: z.string().trim().regex(/^\d{10}$/, "Escribe un teléfono de 10 dígitos"),
    fulfillment: z.enum(["pickup", "delivery"]),
    address: z.string().trim().max(300).optional(),
    note: z.string().trim().max(400).optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
    payment: z.enum(["tienda", "transferencia"]),
    items: z
      .array(
        z.strictObject({
          productId: z.string().trim().min(1).max(80),
          quantity: z.number().int().min(1).max(20),
          gift: z.boolean().optional(),
          flavors: z.array(z.string().trim().min(1).max(40)).max(480).optional(),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillment === "delivery" && (value.address ?? "").trim().length < 8) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Escribe la dirección de envío" });
    }
    if (value.fulfillment === "delivery" && value.payment !== "transferencia") {
      ctx.addIssue({ code: "custom", path: ["payment"], message: "El envío se paga por transferencia" });
    }
    if (!isOrderSlot(value.scheduledDate, value.scheduledTime)) {
      ctx.addIssue({ code: "custom", path: ["scheduledTime"], message: "Elige una hora dentro del horario del local" });
    }
    value.items.forEach((item, index) => {
      for (const flavor of item.flavors ?? []) {
        if (!isFlavorId(flavor)) {
          ctx.addIssue({ code: "custom", path: ["items", index, "flavors"], message: "Ese sabor no está en el menú" });
        }
      }
    });
  });

export const productSchema = z
  .strictObject({
    categoryId: z.string().trim().min(1).max(40),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(2).max(500),
    priceCents: money,
    available: z.boolean(),
    kind: z.enum(["simple", "cookie_box"]),
    cookieCount: z.number().int().min(1).max(24).nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "cookie_box" && value.cookieCount === null) {
      ctx.addIssue({ code: "custom", path: ["cookieCount"], message: "Indica cuántas galletas lleva la caja" });
    }
    if (value.kind === "simple" && value.cookieCount !== null) {
      ctx.addIssue({ code: "custom", path: ["cookieCount"], message: "Este producto no lleva conteo de galletas" });
    }
  });

export const productPatchSchema = z
  .strictObject({
    categoryId: z.string().trim().min(1).max(40).optional(),
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().min(2).max(500).optional(),
    priceCents: money.optional(),
    available: z.boolean().optional(),
    kind: z.enum(["simple", "cookie_box"]).optional(),
    cookieCount: z.number().int().min(1).max(24).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "No hay cambios" });

export const categorySchema = z.strictObject({
  name: z.string().trim().min(2).max(40),
});

export const statusSchema = z.strictObject({
  status: z.enum(["nuevo", "en_preparacion", "listo"]),
});

export const loginSchema = z.strictObject({
  password: z.string().min(1).max(200),
});

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function deliveryAddress(fulfillment: Fulfillment, address: string | undefined): string | null {
  if (fulfillment !== "delivery") return null;
  return (address ?? "").trim();
}
