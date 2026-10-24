CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  photo_key TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('simple', 'cookie_box')),
  cookie_count INTEGER,
  sort_order INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX products_category_idx ON products (category_id, sort_order);

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  public_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('pickup', 'delivery')),
  address TEXT,
  note TEXT,
  status TEXT NOT NULL CHECK (status IN ('nuevo', 'en_preparacion', 'listo')),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at INTEGER NOT NULL
);

CREATE INDEX orders_created_idx ON orders (created_at DESC);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  gift INTEGER,
  flavors TEXT,
  line_total_cents INTEGER NOT NULL
);

CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);

INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('cafe', 'Café', 'cafe', 1),
  ('comida', 'Comida', 'comida', 2),
  ('postres', 'Postres', 'postres', 3);

INSERT INTO products (
  id, category_id, name, description, price_cents, available, photo_key, kind, cookie_count, sort_order, created_at, updated_at
) VALUES
  (
    'pastel-zanahoria', 'postres', 'Pastel de zanahoria',
    'El clásico con nuestro toque, decorado con betún de queso crema y caramelo. Tamaño único, 10 a 15 rebanadas.',
    48000, 1, NULL, 'simple', NULL, 1, 0, 0
  ),
  (
    'panque-platano', 'postres', 'Panqué de plátano (edición navideña)',
    'Nuestro panqué de plátano clásico con un toque navideño, decorado con betún de mascarpone, caramelo y avellanas confitadas. Tamaño único, 10 a 15 rebanadas.',
    43500, 1, NULL, 'simple', NULL, 2, 0, 0
  ),
  (
    'bruce-cake', 'postres', 'Bruce Cake',
    'Para los amantes del chocolate: pastel de chocolate decorado con ganache de chocolate semi amargo. Tamaño único, 10 a 15 rebanadas.',
    75000, 1, NULL, 'simple', NULL, 3, 0, 0
  ),
  (
    'tarta-tiramisu', 'postres', 'Tarta tiramisú',
    'Tarta de chocolate, mousse de café y crema de mascarpone. Tamaño único, 10 a 15 rebanadas.',
    48000, 1, NULL, 'simple', NULL, 4, 0, 0
  ),
  (
    'cheesecake-limon', 'postres', 'Cheesecake de limón',
    'Cheesecake de limón, decorado con merengue italiano y crema de limón. Tamaño único, 10 a 15 rebanadas.',
    48000, 1, NULL, 'simple', NULL, 5, 0, 0
  ),
  (
    'cheesecake-fresa', 'postres', 'Cheesecake de fresa',
    'Cheesecake de vainilla, mermelada de fresa y fresa natural. Tamaño único, 10 a 15 rebanadas.',
    48000, 1, NULL, 'simple', NULL, 6, 0, 0
  ),
  (
    'caja-3-galletas', 'postres', 'Caja de 3 galletas',
    'Galletas a elegir. Clásicas: chispas, s''mores, lotus y manzana. Temporada: chunky monkey y naranja chocolate. Se puede pedir para regalo.',
    21000, 1, NULL, 'cookie_box', 3, 7, 0, 0
  ),
  (
    'caja-6-galletas', 'postres', 'Caja de 6 galletas',
    'Galletas a elegir. Clásicas: chispas, s''mores, lotus y manzana. Temporada: chunky monkey y naranja chocolate. Se puede pedir para regalo.',
    42000, 1, NULL, 'cookie_box', 6, 8, 0, 0
  );
