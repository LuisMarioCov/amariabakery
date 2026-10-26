import { MenuSection } from "../components/MenuSection";
import { SiteFooter } from "../components/SiteFooter";
import { WhatsAppIcon } from "../components/icons";
import { useMenu } from "../lib/menu";

export function MenuPage() {
  const { categories, instagram, whatsapp, error } = useMenu();

  return (
    <>
      <main>
        {error ? (
          <p className="mx-auto max-w-6xl px-4 text-ink-deep" role="alert">
            {error}
          </p>
        ) : null}
        <MenuSection categories={categories} />
      </main>
      <SiteFooter instagram={instagram} whatsapp={whatsapp} />
      <a
        href={`https://wa.me/${whatsapp}`}
        className="fixed right-3 bottom-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_8px_18px_rgb(36_62_82/22%)] sm:right-6 sm:bottom-6 sm:h-14 sm:w-14 [&_svg]:h-6 [&_svg]:w-6 sm:[&_svg]:h-8 sm:[&_svg]:w-8"
        rel="noreferrer"
        target="_blank"
        aria-label="Escribir por WhatsApp"
      >
        <WhatsAppIcon />
      </a>
    </>
  );
}
