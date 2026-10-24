import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  adminCatalog,
  adminLogin,
  adminLogout,
  adminOrders,
  adminSession,
  createCategory,
  createProduct,
  deleteProduct,
  updateOrderStatus,
  updateProduct,
  uploadPhoto,
} from "../lib/api";
import { fileToWebp } from "../lib/image";
import { statusLabel, type MenuCategory, type Order, type OrderStatus, type Product, type ProductKind } from "../shared/catalog";
import { Price } from "../components/Price";

const emptyDraft = {
  categoryId: "postres",
  name: "",
  description: "",
  pricePesos: "",
  available: true,
  kind: "simple" as ProductKind,
  cookieCount: "",
};

export function AdminPage() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string>("nuevo");
  const [draft, setDraft] = useState(emptyDraft);
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");

  async function load() {
    const [catalog, orderList] = await Promise.all([adminCatalog(), adminOrders()]);
    setCategories(catalog.categories);
    setOrders(orderList.orders);
  }

  useEffect(() => {
    adminSession()
      .then(async (session) => {
        setAuthed(session.ok);
        if (session.ok) await load();
      })
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "No se pudo abrir el panel"))
      .finally(() => setReady(true));
  }, []);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await adminLogin(password);
      setAuthed(true);
      setPassword("");
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo iniciar sesión");
    }
  }

  function selectProduct(id: string) {
    setSelectedId(id);
    setNotice("");
    if (id === "nuevo") {
      setDraft(emptyDraft);
      return;
    }
    const product = categories.flatMap((category) => category.products).find((item) => item.id === id);
    if (!product) return;
    setDraft({
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      pricePesos: String(product.priceCents / 100),
      available: product.available,
      kind: product.kind,
      cookieCount: product.cookieCount ? String(product.cookieCount) : "",
    });
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const price = Number(draft.pricePesos);
    if (!Number.isFinite(price) || price < 0) {
      setError("Escribe un precio válido");
      return;
    }
    const payload = {
      categoryId: draft.categoryId,
      name: draft.name,
      description: draft.description,
      priceCents: Math.round(price * 100),
      available: draft.available,
      kind: draft.kind,
      cookieCount: draft.kind === "cookie_box" ? Number(draft.cookieCount) : null,
    };
    try {
      if (selectedId === "nuevo") {
        const created = await createProduct(payload);
        setSelectedId(created.id);
        setNotice("Producto creado");
      } else {
        await updateProduct(selectedId, payload);
        setNotice("Producto actualizado");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo guardar");
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file || selectedId === "nuevo") return;
    setError("");
    try {
      const photo = await fileToWebp(file);
      await uploadPhoto(selectedId, photo);
      setNotice("Foto actualizada");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo subir la foto");
    }
  }

  async function removeProduct() {
    if (selectedId === "nuevo") return;
    setError("");
    try {
      await deleteProduct(selectedId);
      setSelectedId("nuevo");
      setDraft(emptyDraft);
      setNotice("Producto eliminado");
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo eliminar");
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    setError("");
    try {
      await updateOrderStatus(id, status);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo cambiar el estatus");
    }
  }

  const selected = categories.flatMap((category) => category.products).find((product) => product.id === selectedId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl text-ink">Panel de Amaría</h1>
        <Link to="/" className="rounded-full border border-ink px-4 py-2 text-ink">
          Ver menú
        </Link>
      </div>
      {!ready ? <p className="mt-6">Cargando…</p> : null}
      {ready && !authed ? (
        <form className="mt-8 max-w-sm space-y-4" onSubmit={onLogin}>
          <label className="block">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full border border-sand bg-white px-3 py-2"
            />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" className="rounded-full bg-ink px-5 py-3 text-paper">
            Entrar
          </button>
        </form>
      ) : null}
      {authed ? (
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="productos-titulo">
            <div className="flex items-center justify-between">
              <h2 id="productos-titulo" className="font-display text-3xl text-ink">
                Productos
              </h2>
              <button type="button" className="text-sm underline" onClick={() => void adminLogout().then(() => setAuthed(false))}>
                Salir
              </button>
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                void createCategory(categoryName)
                  .then(async (created) => {
                    setCategoryName("");
                    setDraft((current) => ({ ...current, categoryId: created.id }));
                    setNotice("Categoría creada");
                    await load();
                  })
                  .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "No se pudo crear la categoría"));
              }}
            >
              <label className="flex-1">
                Nueva categoría
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="mt-1 w-full border border-sand bg-white px-3 py-2" />
              </label>
              <button type="submit" className="mt-7 rounded-full border border-ink px-4 py-2 text-ink">
                Agregar
              </button>
            </form>
            <label className="mt-4 block">
              Elegir
              <select className="mt-1 w-full border border-sand bg-white px-3 py-2" value={selectedId} onChange={(event) => selectProduct(event.target.value)}>
                <option value="nuevo">Nuevo producto</option>
                {categories.flatMap((category) =>
                  category.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.available ? "" : "Agotado · "}
                      {category.name}: {product.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <form className="mt-4 space-y-3" onSubmit={saveProduct}>
              <label className="block">
                Categoría
                <select className="mt-1 w-full border border-sand bg-white px-3 py-2" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Nombre
                <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full border border-sand bg-white px-3 py-2" />
              </label>
              <label className="block">
                Descripción
                <textarea required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1 w-full border border-sand bg-white px-3 py-2" rows={3} />
              </label>
              <label className="block">
                Precio en pesos
                <input required inputMode="decimal" value={draft.pricePesos} onChange={(event) => setDraft({ ...draft, pricePesos: event.target.value })} className="mt-1 w-full border border-sand bg-white px-3 py-2" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} />
                Disponible
              </label>
              <label className="block">
                Tipo
                <select className="mt-1 w-full border border-sand bg-white px-3 py-2" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as ProductKind })}>
                  <option value="simple">Producto</option>
                  <option value="cookie_box">Caja de galletas</option>
                </select>
              </label>
              {draft.kind === "cookie_box" ? (
                <label className="block">
                  Cantidad de galletas
                  <input required value={draft.cookieCount} onChange={(event) => setDraft({ ...draft, cookieCount: event.target.value })} className="mt-1 w-full border border-sand bg-white px-3 py-2" inputMode="numeric" />
                </label>
              ) : null}
              {selected ? <PhotoField product={selected} onPhoto={onPhoto} /> : null}
              {error ? <p role="alert">{error}</p> : null}
              {notice ? <p>{notice}</p> : null}
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="rounded-full bg-ink px-5 py-3 text-paper">
                  Guardar
                </button>
                {selectedId !== "nuevo" ? (
                  <button type="button" className="rounded-full border border-ink px-5 py-3 text-ink" onClick={() => void removeProduct()}>
                    Eliminar
                  </button>
                ) : null}
              </div>
            </form>
          </section>
          <section aria-labelledby="pedidos-titulo">
            <h2 id="pedidos-titulo" className="font-display text-3xl text-ink">
              Pedidos
            </h2>
            {orders.length === 0 ? <p className="mt-4">Todavía no hay pedidos.</p> : null}
            <ul className="mt-4 space-y-4">
              {orders.map((order) => (
                <li key={order.id} className="border border-sand bg-white p-4">
                  <p className="font-display text-2xl text-ink">Folio {order.publicCode}</p>
                  <p>
                    {order.customerName} · {order.customerPhone}
                  </p>
                  <p>{order.fulfillment === "delivery" ? `Envío a ${order.address}` : "Recoger en el local"}</p>
                  {order.note ? <p>Nota: {order.note}</p> : null}
                  <ul className="mt-2 list-disc pl-5">
                    {order.items.map((item) => (
                      <li key={`${order.id}-${item.productId}-${item.productName}`}>
                        {item.quantity} × {item.productName} · <Price cents={item.lineTotalCents} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    <Price cents={order.totalCents} />
                  </p>
                  <label className="mt-2 block">
                    Estatus
                    <select className="mt-1 w-full border border-sand bg-white px-3 py-2" value={order.status} aria-label={`Estatus de ${order.publicCode}`} onChange={(event) => void changeStatus(order.id, event.target.value as OrderStatus)}>
                      <option value="nuevo">{statusLabel("nuevo")}</option>
                      <option value="en_preparacion">{statusLabel("en_preparacion")}</option>
                      <option value="listo">{statusLabel("listo")}</option>
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function PhotoField({ product, onPhoto }: { product: Product; onPhoto: (file: File | undefined) => Promise<void> }) {
  return (
    <div>
      {product.photoUrl ? <img src={product.photoUrl} alt="" className="mb-2 h-28 w-28 object-cover" /> : <p className="text-sm">Sin foto</p>}
      <label className="block">
        Foto
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full"
          onChange={(event) => void onPhoto(event.target.files?.[0])}
        />
      </label>
    </div>
  );
}
