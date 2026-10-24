import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "../shared/catalog";

export type CartLine = {
  lineId: string;
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  gift: boolean | null;
  flavors: string[];
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  open: boolean;
  pulse: number;
  setOpen: (open: boolean) => void;
  add: (product: Product, options?: { quantity?: number; gift: boolean | null; flavors: string[] }) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "amaria-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readCart());
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const totalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
    return {
      lines,
      count,
      totalCents,
      open,
      pulse,
      setOpen,
      add: (product, options) => {
        const quantity = Math.min(20, Math.max(1, options?.quantity ?? 1));
        const gift = options?.gift ?? null;
        const flavors = options?.flavors ?? [];
        setLines((current) => {
          const index =
            flavors.length === 0 && gift === null
              ? current.findIndex((line) => line.productId === product.id && line.gift === null && line.flavors.length === 0)
              : -1;
          if (index === -1) {
            return [
              ...current,
              {
                lineId: crypto.randomUUID(),
                productId: product.id,
                name: product.name,
                priceCents: product.priceCents,
                quantity,
                gift,
                flavors,
              },
            ];
          }
          return current.map((line, lineIndex) =>
            lineIndex === index ? { ...line, quantity: Math.min(20, line.quantity + quantity) } : line,
          );
        });
        setPulse((value) => value + 1);
      },
      setQuantity: (lineId, quantity) => {
        setLines((current) =>
          current.flatMap((line) => {
            if (line.lineId !== lineId) return [line];
            if (quantity < 1) return [];
            return [{ ...line, quantity: Math.min(20, quantity) }];
          }),
        );
      },
      remove: (lineId) => setLines((current) => current.filter((line) => line.lineId !== lineId)),
      clear: () => setLines([]),
    };
  }, [lines, open, pulse]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("El carrito no está disponible");
  return value;
}

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine);
  } catch {
    return [];
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.lineId === "string" &&
    typeof line.productId === "string" &&
    typeof line.name === "string" &&
    typeof line.priceCents === "number" &&
    typeof line.quantity === "number" &&
    Array.isArray(line.flavors)
  );
}
