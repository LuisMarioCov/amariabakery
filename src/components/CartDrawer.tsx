import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { formatFlavorCounts } from "../shared/catalog";
import { ApiError, createOrder } from "../lib/api";
import { useCart } from "../lib/cart";
import { lockPageScroll } from "../lib/scroll-lock";
import { Price } from "./Price";
import { StoreMapLink } from "./StoreMapLink";

export function CartDrawer() {
  const { lines, open, setOpen, setQuantity, remove, clear, totalCents } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ publicCode: string; whatsappUrl: string; totalCents: number; ticketToken: string } | null>(null);

  useEffect(() => {
    if (!open) setDone(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const unlock = lockPageScroll();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const order = await createOrder({
        customerName: name,
        customerPhone: phone,
        fulfillment,
        address: fulfillment === "delivery" ? address : undefined,
        note: note || undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          ...(line.gift === null ? {} : { gift: line.gift, flavors: line.flavors }),
        })),
      });
      setDone(order);
      clear();
      setNote("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo enviar el pedido");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-[#243e52]/40" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ml-auto flex h-full w-full max-w-md flex-col bg-paper shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-sand px-5 py-4">
          <h2 id={titleId} className="font-display text-3xl text-ink">
            Tu pedido
          </h2>
          <button ref={closeRef} type="button" className="rounded-full border border-ink px-4 py-2 text-ink" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {done ? (
            <div className="space-y-4">
              <p>
                Pedido {done.publicCode} listo. Total <Price cents={done.totalCents} />.
              </p>
              <p className="text-sm">Puedes ver tu ticket, descargarlo y abrir WhatsApp. Después sigues en el menú.</p>
              <div className="flex flex-wrap gap-3">
                <a className="inline-flex rounded-full bg-ink px-5 py-3 text-paper" href={`/pedido/${done.ticketToken}`} onClick={() => setOpen(false)}>
                  Ver ticket
                </a>
                <a className="inline-flex rounded-full border border-ink px-5 py-3 text-ink" href={`/api/tickets/${encodeURIComponent(done.ticketToken)}/pdf?descarga=1`}>
                  Descargar PDF
                </a>
              </div>
              <a className="inline-flex text-sm underline" href={done.whatsappUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                Abrir WhatsApp
              </a>
              <button type="button" className="block cursor-pointer text-sm underline" onClick={() => setOpen(false)}>
                Seguir en el menú
              </button>
            </div>
          ) : lines.length === 0 ? (
            <p>El carrito está vacío.</p>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <ul className="space-y-4">
                {lines.map((line) => (
                  <li key={line.lineId} className="border-b border-sand pb-4">
                    <p className="font-display text-xl text-ink">{line.name}</p>
                    <p>
                      {line.quantity} × <Price cents={line.priceCents} />
                    </p>
                    {line.flavors.length > 0 ? <p className="text-sm">{formatFlavorCounts(line.flavors)}</p> : null}
                    {line.gift !== null ? <p className="text-sm">{line.gift ? "Para regalo" : "Sin regalo"}</p> : null}
                    <div className="mt-2 flex items-center gap-2">
                      {line.flavors.length > 0 ? (
                        <span className="price">
                          {line.quantity} {line.quantity === 1 ? "caja" : "cajas"}
                        </span>
                      ) : (
                        <>
                          <button type="button" className="price h-10 w-10 cursor-pointer border border-ink" aria-label={`Quitar uno de ${line.name}`} onClick={() => setQuantity(line.lineId, line.quantity - 1)}>
                            −
                          </button>
                          <span className="price">{line.quantity}</span>
                          <button type="button" className="price h-10 w-10 cursor-pointer border border-ink" aria-label={`Agregar otro de ${line.name}`} onClick={() => setQuantity(line.lineId, line.quantity + 1)}>
                            +
                          </button>
                        </>
                      )}
                      <button type="button" className="ml-auto text-sm underline" onClick={() => remove(line.lineId)}>
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="flex items-baseline justify-between gap-4">
                <span className="font-display text-2xl text-ink">Total</span>
                <Price cents={totalCents} className="text-2xl text-ink-deep" />
              </p>
              <label className="block">
                Nombre
                <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full border border-sand bg-white px-3 py-2" autoComplete="name" />
              </label>
              <label className="block">
                Teléfono
                <input required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full border border-sand bg-white px-3 py-2" />
              </label>
              <fieldset>
                <legend>Entrega</legend>
                <label className="mt-2 flex gap-2">
                  <input type="radio" name="fulfillment" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} />
                  Recoger en el local
                </label>
                <label className="mt-2 flex gap-2">
                  <input type="radio" name="fulfillment" checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} />
                  Enviar
                </label>
              </fieldset>
              {fulfillment === "delivery" ? (
                <label className="block">
                  Dirección
                  <textarea required minLength={8} maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full border border-sand bg-white px-3 py-2" rows={3} />
                </label>
              ) : null}
              <label className="block">
                Nota
                <textarea maxLength={400} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full border border-sand bg-white px-3 py-2" rows={2} />
              </label>
              {error ? <p role="alert">{error}</p> : null}
              {fulfillment === "delivery" ? (
                <p className="text-sm text-ink-deep">
                  El envío se paga por transferencia. Al hacerla, envía el pedido por WhatsApp junto con el comprobante.
                </p>
              ) : (
                <p className="text-sm">
                  El cobro es en efectivo o por transferencia al recoger.
                  <br />
                  <StoreMapLink />
                </p>
              )}
              <button type="submit" disabled={pending} className="cursor-pointer rounded-full bg-ink px-5 py-3 text-paper disabled:cursor-not-allowed disabled:opacity-60">
                {pending ? "Enviando…" : "Confirmar y abrir WhatsApp"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
