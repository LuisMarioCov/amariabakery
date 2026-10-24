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
import { OrderBoard } from "../components/OrderBoard";
import { Price } from "../components/Price";
import { fileToWebp } from "../lib/image";
import type { MenuCategory, Order, OrderStatus, Product, ProductKind } from "../shared/catalog";

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
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(0);
  const [section, setSection] = useState<"pedidos" | "menu">("pedidos");

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

  function startProduct(categoryId: string) {
    setSelectedId("nuevo");
    setNotice("");
    setError("");
    setConfirmDelete(0);
    setAddingCategory(false);
    setDraft({ ...emptyDraft, categoryId });
  }

  function selectProduct(id: string) {
    setSelectedId(id);
    setNotice("");
    setConfirmDelete(0);
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
        setNotice("Listo");
      } else {
        await updateProduct(selectedId, payload);
        setNotice("Listo");
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
      setNotice("Listo");
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
      setSelectedId("");
      setDraft(emptyDraft);
      setConfirmDelete(0);
      setNotice("");
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
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2" role="tablist" aria-label="Secciones del panel">
              <button type="button" role="tab" aria-selected={section === "pedidos"} className={`cursor-pointer rounded-full px-4 py-2 ${section === "pedidos" ? "bg-ink text-paper" : "border border-ink text-ink"}`} onClick={() => setSection("pedidos")}>
                Pedidos
              </button>
              <button type="button" role="tab" aria-selected={section === "menu"} className={`cursor-pointer rounded-full px-4 py-2 ${section === "menu" ? "bg-ink text-paper" : "border border-ink text-ink"}`} onClick={() => setSection("menu")}>
                Modificar menú
              </button>
            </div>
            <button type="button" className="cursor-pointer text-sm underline" onClick={() => void adminLogout().then(() => setAuthed(false))}>
              Salir
            </button>
          </div>
          {section === "pedidos" ? (
            <section className="mt-6" aria-labelledby="pedidos-titulo">
              <h2 id="pedidos-titulo" className="sr-only">
                Pedidos
              </h2>
              {error ? <p role="alert">{error}</p> : null}
              <OrderBoard orders={orders} onStatus={(id, status) => void changeStatus(id, status)} />
            </section>
          ) : (
          <section className="mt-6" aria-labelledby="productos-titulo">
            <h2 id="productos-titulo" className="sr-only">
              Modificar menú
            </h2>
            {selectedId === "" ? (
              <div>
                {error ? <p role="alert">{error}</p> : null}
                {categories.map((category) => (
                  <div key={category.id} className="mt-6">
                    <h3 className="font-display text-2xl text-ink">{category.name}</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {category.products.map((product) => (
                        <button key={product.id} type="button" className="cursor-pointer bg-white p-4 text-left" onClick={() => selectProduct(product.id)}>
                          <span className="block font-display text-xl text-ink">{product.name}</span>
                          <span className="mt-2 flex items-center justify-between gap-2">
                            <Price cents={product.priceCents} />
                            {product.available ? null : <span className="text-xs">Agotado</span>}
                          </span>
                        </button>
                      ))}
                      <button type="button" className="grid h-full min-h-28 cursor-pointer place-items-center bg-white font-display text-4xl text-ink" aria-label={`Agregar en ${category.name}`} onClick={() => startProduct(category.id)}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {addingCategory ? (
                  <form
                    className="mt-8 flex max-w-md gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setError("");
                      void createCategory(categoryName)
                        .then(async () => {
                          setCategoryName("");
                          setAddingCategory(false);
                          await load();
                        })
                        .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "No se pudo crear la categoría"));
                    }}
                  >
                    <input aria-label="Nombre de la categoría" placeholder="Nombre" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="w-full border border-sand bg-white px-3 py-3" />
                    <button type="submit" className="cursor-pointer rounded-full bg-ink px-5 py-3 text-paper">
                      Crear
                    </button>
                  </form>
                ) : (
                  <button type="button" className="mt-8 cursor-pointer text-sm text-ink underline" onClick={() => setAddingCategory(true)}>
                    Agregar categoría
                  </button>
                )}
              </div>
            ) : (
            <form className="mx-auto max-w-lg space-y-4 pb-28" onSubmit={saveProduct}>
              <button type="button" className="cursor-pointer rounded-full border border-ink px-4 py-2 text-ink" onClick={() => { setSelectedId(""); setNotice(""); setError(""); setConfirmDelete(0); }}>
                Volver
              </button>
              {selected ? <PhotoField product={selected} onPhoto={onPhoto} /> : null}
              <input required aria-label="Nombre" placeholder="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="w-full border border-sand bg-white px-3 py-3" />
              <input required aria-label="Precio" placeholder="Precio" inputMode="decimal" value={draft.pricePesos} onChange={(event) => setDraft({ ...draft, pricePesos: event.target.value })} className="price w-full border border-sand bg-white px-3 py-3" />
              <textarea required aria-label="Descripción" placeholder="Descripción" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="w-full border border-sand bg-white px-3 py-3" rows={2} />
              <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button key={category.id} type="button" className={`cursor-pointer rounded-full px-4 py-2 ${draft.categoryId === category.id ? "bg-ink text-paper" : "border border-sand bg-white text-ink"}`} onClick={() => setDraft({ ...draft, categoryId: category.id })}>
                    {category.name}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Disponible" className="flex flex-wrap gap-2">
                <button type="button" className={`cursor-pointer rounded-full px-4 py-2 ${draft.available ? "bg-ink text-paper" : "border border-sand bg-white text-ink"}`} onClick={() => setDraft({ ...draft, available: true })}>
                  Disponible
                </button>
                <button type="button" className={`cursor-pointer rounded-full px-4 py-2 ${draft.available ? "border border-sand bg-white text-ink" : "bg-ink text-paper"}`} onClick={() => setDraft({ ...draft, available: false })}>
                  Agotado
                </button>
              </div>
              <div role="group" aria-label="Tipo" className="flex flex-wrap gap-2">
                <button type="button" className={`cursor-pointer rounded-full px-4 py-2 ${draft.kind === "simple" ? "bg-ink text-paper" : "border border-sand bg-white text-ink"}`} onClick={() => setDraft({ ...draft, kind: "simple" })}>
                  Producto
                </button>
                <button type="button" className={`cursor-pointer rounded-full px-4 py-2 ${draft.kind === "cookie_box" ? "bg-ink text-paper" : "border border-sand bg-white text-ink"}`} onClick={() => setDraft({ ...draft, kind: "cookie_box" })}>
                  Caja de galletas
                </button>
              </div>
              {draft.kind === "cookie_box" ? (
                <input required aria-label="Galletas en la caja" placeholder="Galletas en la caja" value={draft.cookieCount} onChange={(event) => setDraft({ ...draft, cookieCount: event.target.value })} className="price w-full border border-sand bg-white px-3 py-3" inputMode="numeric" />
              ) : null}
              {selectedId !== "nuevo" ? (
                  <button
                    type="button"
                    className="cursor-pointer rounded-full bg-[#f3c9c6] px-5 py-3 text-[#6b3330]"
                    onClick={() => {
                      if (confirmDelete < 2) {
                        setConfirmDelete(confirmDelete + 1);
                        return;
                      }
                      void removeProduct();
                    }}
                  >
                    {confirmDelete === 0 ? "Borrar" : confirmDelete === 1 ? "Sí, borrar" : "¿Segura?"}
                  </button>
                ) : null}
              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand bg-paper px-4 py-3">
                {error ? <p className="mx-auto mb-2 max-w-lg" role="alert">{error}</p> : null}
                {notice ? <p className="mx-auto mb-2 max-w-lg">{notice}</p> : null}
                <button type="submit" className="mx-auto block w-full max-w-lg cursor-pointer bg-ink py-3 text-paper">
                  Guardar
                </button>
              </div>
            </form>
            )}
          </section>
          )}
        </div>
      ) : null}
    </main>
  );
}

function PhotoField({ product, onPhoto }: { product: Product; onPhoto: (file: File | undefined) => Promise<void> }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      {product.photoUrl ? <img src={product.photoUrl} alt="" className="h-16 w-16 object-cover" /> : <span className="grid h-16 w-16 place-items-center bg-mist text-xs text-ink">Foto</span>}
      <span className="rounded-full border border-ink px-4 py-2 text-ink">Cambiar foto</span>
      <input type="file" accept="image/*" className="sr-only" onChange={(event) => void onPhoto(event.target.files?.[0])} />
    </label>
  );
}
