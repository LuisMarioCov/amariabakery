import type { MenuCategory, Product, ProductKind } from "../shared/catalog";

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  available: number;
  photo_key: string | null;
  kind: ProductKind;
  cookie_count: number | null;
  category_name: string;
  category_slug: string;
  category_sort: number;
  sort_order: number;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    available: row.available === 1,
    photoUrl: row.photo_key ? `/api/media/${row.photo_key}` : null,
    kind: row.kind,
    cookieCount: row.cookie_count,
  };
}

export async function listCategories(db: D1Database, onlyAvailable: boolean): Promise<MenuCategory[]> {
  const result = await db
    .prepare(
      `SELECT p.id, p.category_id, p.name, p.description, p.price_cents, p.available, p.photo_key,
              p.kind, p.cookie_count, p.sort_order,
              c.name AS category_name, c.slug AS category_slug, c.sort_order AS category_sort
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${onlyAvailable ? "WHERE p.available = 1" : ""}
       ORDER BY c.sort_order, p.sort_order`,
    )
    .all<ProductRow>();
  const categories = new Map<string, MenuCategory>();
  if (!onlyAvailable) {
    const allCategories = await db
      .prepare("SELECT id, name, slug FROM categories ORDER BY sort_order")
      .all<{ id: string; name: string; slug: string }>();
    for (const category of allCategories.results) {
      categories.set(category.id, { ...category, products: [] });
    }
  }
  for (const row of result.results) {
    const existing = categories.get(row.category_id) ?? {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      products: [],
    };
    existing.products.push(toProduct(row));
    categories.set(row.category_id, existing);
  }
  return [...categories.values()].filter((category) => !onlyAvailable || category.products.length > 0);
}

export async function getProduct(db: D1Database, id: string): Promise<ProductRow | null> {
  return db
    .prepare(
      `SELECT p.id, p.category_id, p.name, p.description, p.price_cents, p.available, p.photo_key,
              p.kind, p.cookie_count, p.sort_order,
              c.name AS category_name, c.slug AS category_slug, c.sort_order AS category_sort
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
    )
    .bind(id)
    .first<ProductRow>();
}

export async function getProductByPhoto(db: D1Database, photoKey: string): Promise<ProductRow | null> {
  return db
    .prepare(
      `SELECT p.id, p.category_id, p.name, p.description, p.price_cents, p.available, p.photo_key,
              p.kind, p.cookie_count, p.sort_order,
              c.name AS category_name, c.slug AS category_slug, c.sort_order AS category_sort
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.photo_key = ?`,
    )
    .bind(photoKey)
    .first<ProductRow>();
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "producto";
}
