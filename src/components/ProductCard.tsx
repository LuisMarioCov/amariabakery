import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { FLAVORS, type Product } from "../shared/catalog";
import { useCart } from "../lib/cart";
import { flyToCart, throwDialogToCart } from "../lib/fly-to-cart";
import { lockPageScroll } from "../lib/scroll-lock";
import { CartIcon } from "./icons";
import { Price } from "./Price";

const flavorGroups = [...new Set(FLAVORS.map((flavor) => flavor.group))];

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [gift, setGift] = useState<"si" | "no" | "">("");
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(FLAVORS.map((flavor) => [flavor.id, 0])));
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const titleId = useId();

  const perBox = product.cookieCount ?? 0;
  const selected = FLAVORS.reduce((sum, flavor) => sum + (counts[flavor.id] ?? 0), 0);
  const box = product.kind === "cookie_box";
  const needed = box ? perBox * quantity : 0;
  const ready = !box || (gift !== "" && selected === needed);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const unlock = lockPageScroll();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function changeQuantity(next: number) {
    const clamped = Math.min(20, Math.max(1, next));
    if (box) {
      const cap = perBox * clamped;
      setCounts((current) => trimCounts(current, cap));
    }
    setQuantity(clamped);
  }

  function changeFlavor(id: string, next: number) {
    setCounts((current) => {
      const others = FLAVORS.reduce((sum, flavor) => sum + (flavor.id === id ? 0 : (current[flavor.id] ?? 0)), 0);
      return { ...current, [id]: Math.max(0, Math.min(next, needed - others)) };
    });
  }

  function commit(options: { quantity: number; gift: boolean | null; flavors: string[] }) {
    add(product, options);
    setQuantity(1);
    setGift("");
    setCounts(Object.fromEntries(FLAVORS.map((flavor) => [flavor.id, 0])));
    setOpen(false);
    leavingRef.current = false;
  }

  function addToCart() {
    if (!ready || leavingRef.current) return;
    leavingRef.current = true;
    const flavors = box ? FLAVORS.flatMap((flavor) => Array.from({ length: counts[flavor.id] ?? 0 }, () => flavor.id)) : [];
    const options = { quantity, gift: box ? gift === "si" : null, flavors };
    const dialog = dialogRef.current;
    if (dialog) throwDialogToCart(dialog, shadeRef.current, () => commit(options));
    else commit(options);
  }

  function addFromCard(event: MouseEvent<HTMLButtonElement>) {
    if (box) {
      setOpen(true);
      return;
    }
    if (leavingRef.current) return;
    leavingRef.current = true;
    const from = event.currentTarget.getBoundingClientRect();
    flyToCart(from, product.name, () => commit({ quantity: 1, gift: null, flavors: [] }));
  }

  return (
    <article className="menu-tile flex h-full flex-col">
      <button type="button" className="block w-full cursor-pointer" aria-label={product.name} onClick={() => setOpen(true)}>
        <ProductPhoto product={product} />
      </button>
      <div className="flex flex-1 flex-col px-2.5 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">
        <h3>
          <button type="button" className="w-full cursor-pointer text-left font-display text-lg leading-tight tracking-wide text-ink sm:text-2xl" onClick={() => setOpen(true)}>
            {product.name}
          </button>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price cents={product.priceCents} className="text-base text-ink-deep" />
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-paper [&_svg]:h-4 [&_svg]:w-4"
            aria-label={`Agregar ${product.name} al carrito`}
            onClick={addFromCard}
          >
            <CartIcon />
          </button>
        </div>
      </div>
      {open
        ? createPortal(
            <div
              ref={shadeRef}
              className="menu-shade fixed inset-0 z-40 flex items-end justify-center bg-[#243e52]/45 p-3 sm:items-center sm:p-6"
              onClick={() => {
                if (!leavingRef.current) setOpen(false);
              }}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="menu-card relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden bg-paper"
                onClick={(event) => event.stopPropagation()}
              >
                <button ref={closeRef} type="button" className="price absolute top-3 right-3 z-10 cursor-pointer bg-paper/90 px-2 text-2xl leading-none text-ink" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  ×
                </button>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ProductPhoto product={product} framed />
                  <div className="px-5 py-5">
                  <h2 id={titleId} className="font-display text-3xl tracking-wide text-ink">
                    {product.name}
                  </h2>
                  <p className="mt-3 text-ink-deep">{product.description}</p>
                  <p className="mt-4">
                    <Price cents={product.priceCents} className="text-2xl text-ink-deep" />
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-ink">Cantidad</span>
                    <Stepper
                      value={quantity}
                      decreaseLabel={`Disminuir cantidad de ${product.name}`}
                      increaseLabel={`Aumentar cantidad de ${product.name}`}
                    decreaseDisabled={quantity <= 1}
                    increaseDisabled={quantity >= 20}
                    onDecrease={() => changeQuantity(quantity - 1)}
                    onIncrease={() => changeQuantity(quantity + 1)}
                    />
                  </div>
                  {box ? (
                    <div className="mt-5 space-y-4">
                      <fieldset>
                        <legend className="text-ink">Regalo</legend>
                        <div className="mt-2 flex flex-wrap gap-4">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input type="radio" name={`${product.id}-gift`} checked={gift === "no"} onChange={() => setGift("no")} />
                            Sin regalo
                          </label>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input type="radio" name={`${product.id}-gift`} checked={gift === "si"} onChange={() => setGift("si")} />
                            Para regalo
                          </label>
                        </div>
                      </fieldset>
                      {flavorGroups.map((group) => (
                        <fieldset key={group}>
                          <legend className="font-display text-xl text-ink">{group}</legend>
                          <ul className="mt-2">
                            {FLAVORS.filter((flavor) => flavor.group === group).map((flavor) => {
                              const count = counts[flavor.id] ?? 0;
                              return (
                                <li key={flavor.id} className="flex items-center justify-between gap-3 border-t border-sand py-2">
                                  <span>{flavor.name}</span>
                                  <Stepper
                                    value={count}
                                    decreaseLabel={`Quitar ${flavor.name}`}
                                    increaseLabel={`Sumar ${flavor.name}`}
                                    decreaseDisabled={count === 0}
                                    increaseDisabled={selected >= needed}
                                    onDecrease={() => changeFlavor(flavor.id, count - 1)}
                                    onIncrease={() => changeFlavor(flavor.id, count + 1)}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </fieldset>
                      ))}
                      <p className="price text-sm text-ink-deep">
                        {selected} de {needed} galletas
                        {quantity > 1 ? ` · ${quantity} cajas de ${perBox}` : ""}
                      </p>
                    </div>
                  ) : null}
                  <button type="button" className="mt-6 w-full cursor-pointer rounded-full bg-ink px-5 py-3 text-paper disabled:cursor-not-allowed disabled:opacity-40" disabled={!ready} onClick={addToCart}>
                    Agregar al carrito
                  </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}

function trimCounts(current: Record<string, number>, cap: number): Record<string, number> {
  const copy = { ...current };
  let total = FLAVORS.reduce((sum, flavor) => sum + (copy[flavor.id] ?? 0), 0);
  for (let index = FLAVORS.length - 1; index >= 0 && total > cap; index -= 1) {
    const id = FLAVORS[index].id;
    const have = copy[id] ?? 0;
    const remove = Math.min(have, total - cap);
    copy[id] = have - remove;
    total -= remove;
  }
  return copy;
}

function ProductPhoto({ product, framed = false }: { product: Product; framed?: boolean }) {
  return (
    <span className={`flex aspect-[4/3] items-center justify-center bg-mist ${framed ? "shrink-0" : ""}`}>
      {product.photoUrl ? (
        <img src={product.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <img src="/brand/logo-seal.webp" alt="" width="160" height="155" className="h-16 w-auto sm:h-36" />
      )}
    </span>
  );
}

function Stepper({
  value,
  decreaseLabel,
  increaseLabel,
  decreaseDisabled,
  increaseDisabled,
  onDecrease,
  onIncrease,
}: {
  value: number;
  decreaseLabel: string;
  increaseLabel: string;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <span className="flex items-center gap-2">
      <button type="button" className="price grid h-10 w-10 cursor-pointer place-items-center border border-ink text-ink disabled:cursor-not-allowed disabled:opacity-40" aria-label={decreaseLabel} disabled={decreaseDisabled} onClick={onDecrease}>
        −
      </button>
      <span className="price w-6 text-center">{value}</span>
      <button type="button" className="price grid h-10 w-10 cursor-pointer place-items-center border border-ink text-ink disabled:cursor-not-allowed disabled:opacity-40" aria-label={increaseLabel} disabled={increaseDisabled} onClick={onIncrease}>
        +
      </button>
    </span>
  );
}
