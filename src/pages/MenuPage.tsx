import { MenuSection } from "../components/MenuSection";
import { SiteFooter } from "../components/SiteFooter";
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
    </>
  );
}
