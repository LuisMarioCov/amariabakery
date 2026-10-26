import { StoreInfo } from "./StoreInfo";

export function SiteFooter({ instagram, whatsapp }: { instagram: string; whatsapp: string }) {
  return (
    <footer className="border-t border-sand">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-8 pb-16 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center sm:gap-x-12 sm:px-6 sm:py-8 sm:pr-24">
        <div className="flex items-center gap-3">
          <img src="/brand/logo-seal.webp" alt="" width="160" height="155" className="h-14 w-auto" />
          <div>
            <p className="font-display text-2xl leading-none text-ink">Amaría Bakery</p>
            <p className="mt-1 font-script text-2xl leading-none text-ink">Colima</p>
          </div>
        </div>
        <StoreInfo lines />
        <div className="text-sm leading-relaxed text-ink-deep sm:justify-self-end sm:text-right">
          <p>Pago en efectivo o transferencia al recoger o al entregar.</p>
          <p className="mt-2 flex gap-4 sm:justify-end">
            <a className="text-ink underline" href={`https://wa.me/${whatsapp}`}>
              WhatsApp
            </a>
            <a className="text-ink underline" href={`https://instagram.com/${instagram}`} rel="noreferrer" target="_blank">
              @{instagram}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
