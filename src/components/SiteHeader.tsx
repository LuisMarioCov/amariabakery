import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../lib/cart";
import { CartIcon, InstagramIcon, WhatsAppIcon } from "./icons";

function SocialLinks({ instagram, whatsapp }: { instagram: string; whatsapp: string }) {
  return (
    <>
      <a
        href={`https://wa.me/${whatsapp}`}
        className="grid h-11 w-11 cursor-pointer place-items-center text-ink sm:h-14 sm:w-14"
        rel="noreferrer"
        target="_blank"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon />
      </a>
      <a
        href={`https://instagram.com/${instagram}`}
        className="grid h-11 w-11 cursor-pointer place-items-center text-ink sm:h-14 sm:w-14"
        rel="noreferrer"
        target="_blank"
        aria-label="Instagram"
      >
        <InstagramIcon />
      </a>
    </>
  );
}

export function SiteHeader({ instagram, whatsapp }: { instagram: string; whatsapp: string }) {
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
      <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-center px-4 sm:grid sm:h-auto sm:min-h-[6.25rem] sm:grid-cols-[1fr_auto_1fr] sm:px-6">
        <div className="absolute left-2 flex items-center sm:hidden [&_svg]:h-[22px] [&_svg]:w-[22px]">
          <SocialLinks instagram={instagram} whatsapp={whatsapp} />
        </div>
        <div className="hidden sm:block" />
        <h1 className="justify-self-center">
          <a href="#inicio" className="inline-flex cursor-pointer">
            <img src="/brand/logo-wordmark.webp" alt="Amaría Bakery" width="280" height="118" className="h-12 w-auto sm:h-20" />
          </a>
        </h1>
        <div className="absolute right-2 flex items-center sm:static sm:justify-self-end [&_svg]:h-[22px] [&_svg]:w-[22px] sm:[&_svg]:h-[30px] sm:[&_svg]:w-[30px]">
          <div className="hidden sm:flex sm:items-center">
            <SocialLinks instagram={instagram} whatsapp={whatsapp} />
          </div>
          <button
            type="button"
            className="relative grid h-11 w-11 cursor-pointer place-items-center text-ink sm:h-14 sm:w-14"
            id="cart-button"
            aria-label={count > 0 ? `Carrito, ${count} ${count === 1 ? "producto" : "productos"}` : "Carrito"}
            onClick={() => setOpen(true)}
          >
            <span key={pulse} className={pulse > 0 ? "cart-pop" : undefined}>
              <CartIcon />
            </span>
            {count > 0 ? (
              <span key={`count-${pulse}`} className="price cart-pop absolute top-0 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-ink-deep px-1 text-xs leading-none text-paper sm:top-1 sm:right-1">
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
