export function SiteFooter({ instagram, whatsapp }: { instagram: string; whatsapp: string }) {
  return (
    <footer className="border-t border-sand">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <img src="/brand/logo-seal.webp" alt="" width="160" height="155" className="mb-3 h-16 w-auto" />
          <p className="font-display text-2xl text-ink">Amaría Bakery</p>
          <p className="font-script text-2xl text-ink">Colima</p>
        </div>
        <div className="space-y-2">
          <p>Pago en efectivo o transferencia al recoger o al entregar.</p>
          <p>
            <a className="underline" href={`https://wa.me/${whatsapp}`}>
              WhatsApp
            </a>
            {" · "}
            <a className="underline" href={`https://instagram.com/${instagram}`} rel="noreferrer" target="_blank">
              @{instagram}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
