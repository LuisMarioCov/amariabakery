import type { MenuCategory } from "../shared/catalog";
import { ProductCard } from "./ProductCard";

export function MenuSection({ categories }: { categories: MenuCategory[] }) {
  return (
    <div id="menu" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      {categories.map((category) => (
        <section key={category.id} id={category.slug} className="pt-8" aria-labelledby={`${category.slug}-titulo`}>
          <h2 id={`${category.slug}-titulo`} className="font-display text-4xl tracking-wide text-ink">
            {category.name}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-7 lg:grid-cols-3">
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
