import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../lib/cart";
import { CartIcon, InstagramIcon } from "./icons";

export function SiteHeader({ instagram }: { instagram: string }) {
  const { count, setOpen, pulse } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (pulse === 0) return;
    setAdded(true);
    const timer = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [pulse]);
  return (
    <header className="sticky top-0 z-20 border-b border-sand bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto grid min-h-[6.25rem] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
        <div />
        <h1 className="justify-self-center">
          <a href="#inicio" className="inline-flex cursor-pointer">
            <img src="/brand/logo-wordmark.webp" alt="Amaría Bakery" width="280" height="118" className="h-16 w-auto sm:h-20" />
          </a>
        </h1>
        <div className="flex items-center justify-end gap-1">
          <a
            href={`https://instagram.com/${instagram}`}
            className="grid h-14 w-14 cursor-pointer place-items-center text-ink"
            rel="noreferrer"
            target="_blank"
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
          <button
            type="button"
            className="relative grid h-14 w-14 cursor-pointer place-items-center text-ink"
            id="cart-button"
            aria-label={count > 0 ? `Carrito, ${count} ${count === 1 ? "producto" : "productos"}` : "Carrito"}
            onClick={() => setOpen(true)}
          >
            <span key={pulse} className={pulse > 0 ? "cart-pop" : undefined}>
              <CartIcon />
            </span>
            {count > 0 ? (
              <span key={`count-${pulse}`} className="price cart-pop absolute top-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink-deep px-1 text-xs leading-none text-paper">
                {count}
              </span>
            ) : null}
            {added ? (
              <span role="status" className="added-note pointer-events-none absolute top-full right-0 z-30 mt-1 rounded-full bg-ink px-3 py-1 text-sm whitespace-nowrap text-paper">
                Agregado
              </span>
            ) : null}
          </button>
        </div>
      </div>
      <Link to="/admin" className="sr-only">
        Administración
      </Link>
    </header>
  );
}
