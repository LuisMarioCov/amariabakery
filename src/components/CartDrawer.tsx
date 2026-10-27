import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatFlavorCounts, formatScheduleTime, orderDates, orderTimes } from "../shared/catalog";
import { ApiError, createOrder } from "../lib/api";
import { useCart } from "../lib/cart";
import { lockPageScroll } from "../lib/scroll-lock";
import { Price } from "./Price";
import { StoreInfo } from "./StoreInfo";

const fieldClass = "mt-1.5 w-full border border-sand bg-white px-4 py-3.5 text-base text-ink-deep placeholder:text-slate";

function FormBlock({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="float-left w-full font-display text-[1.65rem] leading-tight text-ink">{title}</legend>
      <div className="clear-both pt-2">
        {hint ? <p className="text-sm leading-snug text-slate">{hint}</p> : null}
        <div className={hint ? "mt-3" : ""}>{children}</div>
      </div>
    </fieldset>
  );
}

function TimeChoices({ title, slots, selected, onSelect }: { title: string; slots: string[]; selected: string; onSelect: (slot: string) => void }) {
  if (slots.length === 0) return null;
  return (
    <div>
      <p className="text-sm text-slate">{title}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const chosen = slot === selected;
          return (
            <label key={slot} className={`relative cursor-pointer whitespace-nowrap border px-2 py-2.5 text-center text-sm ${chosen ? "border-ink bg-ink text-paper" : "border-sand bg-white text-ink"}`}>
              <input type="radio" name="order-time" className="sr-only" value={slot} checked={chosen} onChange={() => onSelect(slot)} />
              {formatScheduleTime(slot)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function dayChip(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, 18, 0));
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-MX", { ...options, timeZone: "America/Mexico_City" }).format(instant);
  return {
    weekday: format({ weekday: "short" }).replace(".", ""),
    day: format({ day: "numeric" }),
    label: format({ weekday: "long", day: "numeric", month: "long" }).replace(/^\p{L}/u, (letter) => letter.toUpperCase()),
  };
}

export function CartDrawer() {
  const { lines, open, setOpen, setQuantity, remove, clear, totalCents } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const dates = orderDates();
  const [date, setDate] = useState(dates[0]?.date ?? "");
  const times = orderTimes(date);
  const [time, setTime] = useState(times[0] ?? "");
  const morning = times.filter((slot) => slot < "16:30");
  const afternoon = times.filter((slot) => slot >= "16:30");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ publicCode: string; whatsappUrl: string; totalCents: number; ticketToken: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setDone(null);
      return;
    }
    const nextDates = orderDates();
    setDate((current) => {
      const chosen = nextDates.some((day) => day.date === current) ? current : (nextDates[0]?.date ?? "");
      const slots = orderTimes(chosen);
      setTime((currentTime) => (slots.includes(currentTime) ? currentTime : (slots[0] ?? "")));
      return chosen;
    });
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
        scheduledDate: date,
        scheduledTime: time,
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
        className="ml-auto flex h-full w-full max-w-lg flex-col overflow-hidden bg-paper shadow-xl"
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
        <div className="flex min-h-0 flex-1 flex-col">
          {done ? (
            <div className="space-y-4 px-6 py-6">
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
            <p className="px-6 py-6">El carrito está vacío.</p>
          ) : (
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
              <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5 [scrollbar-color:#cbc4b5_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-sand [&::-webkit-scrollbar-track]:bg-transparent">
                <ul className="space-y-3">
                  {lines.map((line) => (
                    <li key={line.lineId} className="border border-sand bg-white p-4">
                      <p className="font-display text-xl text-ink">{line.name}</p>
                      <p className="mt-1 text-sm">
                        {line.quantity} × <Price cents={line.priceCents} />
                      </p>
                      {line.flavors.length > 0 ? <p className="mt-1 text-sm text-ink-deep">{formatFlavorCounts(line.flavors)}</p> : null}
                      {line.gift !== null ? <p className="text-sm text-ink-deep">{line.gift ? "Para regalo" : "Sin regalo"}</p> : null}
                      <div className="mt-3 flex items-center gap-3">
                        {line.flavors.length > 0 ? (
                          <span className="price text-sm">
                            {line.quantity} {line.quantity === 1 ? "caja" : "cajas"}
                          </span>
                        ) : (
                          <>
                            <button type="button" className="price h-10 w-10 cursor-pointer border border-sand bg-paper" aria-label={`Quitar uno de ${line.name}`} onClick={() => setQuantity(line.lineId, line.quantity - 1)}>
                              −
                            </button>
                            <span className="price">{line.quantity}</span>
                            <button type="button" className="price h-10 w-10 cursor-pointer border border-sand bg-paper" aria-label={`Agregar otro de ${line.name}`} onClick={() => setQuantity(line.lineId, line.quantity + 1)}>
                              +
                            </button>
                          </>
                        )}
                        <button type="button" className="ml-auto text-sm text-ink underline" onClick={() => remove(line.lineId)}>
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
                <FormBlock title="Tus datos">
                  <div className="space-y-4">
                    <label className="block text-sm text-ink">
                      Nombre
                      <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} autoComplete="name" placeholder="Tu nombre" />
                    </label>
                    <label className="block text-sm text-ink">
                      Teléfono
                      <input required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} placeholder="10 dígitos" />
                    </label>
                  </div>
                </FormBlock>
                <FormBlock title="Fecha para tu pedido" hint="Lunes a sábado. Los domingos no hay servicio.">
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                    {dates.map((option) => {
                      const chip = dayChip(option.date);
                      const selected = option.date === date;
                      return (
                        <label key={option.date} className={`relative flex h-[4.5rem] w-16 shrink-0 cursor-pointer flex-col items-center justify-center border ${selected ? "border-ink bg-ink text-paper" : "border-sand bg-white text-ink"}`}>
                          <input
                            type="radio"
                            name="order-date"
                            className="sr-only"
                            value={option.date}
                            checked={selected}
                            onChange={() => {
                              const slots = orderTimes(option.date);
                              setDate(option.date);
                              setTime((current) => (slots.includes(current) ? current : (slots[0] ?? "")));
                            }}
                          />
                          <span className="sr-only">{chip.label}</span>
                          <span aria-hidden="true" className="text-xs capitalize">{chip.weekday}</span>
                          <span aria-hidden="true" className="font-display text-2xl leading-none">{chip.day}</span>
                        </label>
                      );
                    })}
                  </div>
                  {date ? <p className="mt-3 text-sm text-ink-deep">{dayChip(date).label}</p> : null}
                </FormBlock>
                <FormBlock title="¿A qué hora quieres tu pedido?" hint={<><span className="block">8:00 a. m. a 1:30 p. m.</span><span className="block">4:30 p. m. a 9:30 p. m.</span></>}>
                  <div className="space-y-4">
                    <TimeChoices title="Mañana" slots={morning} selected={time} onSelect={setTime} />
                    <TimeChoices title="Tarde" slots={afternoon} selected={time} onSelect={setTime} />
                  </div>
                </FormBlock>
                <FormBlock title="¿Cómo lo recibes?">
                  <div className="grid gap-2">
                    <label className={`relative flex cursor-pointer gap-3 border p-4 ${fulfillment === "pickup" ? "border-ink bg-white" : "border-sand bg-paper"}`}>
                      <input type="radio" name="fulfillment" className="sr-only" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} />
                      <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${fulfillment === "pickup" ? "border-ink bg-ink shadow-[inset_0_0_0_3px_#f1f1ef]" : "border-slate bg-white"}`} aria-hidden="true" />
                      <span>
                        <span className="block font-display text-xl leading-tight text-ink">Recoger en el local</span>
                        <span className="mt-1 block text-sm text-ink-deep">Pago en efectivo o transferencia al recoger.</span>
                      </span>
                    </label>
                    <label className={`relative flex cursor-pointer gap-3 border p-4 ${fulfillment === "delivery" ? "border-ink bg-white" : "border-sand bg-paper"}`}>
                      <input type="radio" name="fulfillment" className="sr-only" checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} />
                      <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${fulfillment === "delivery" ? "border-ink bg-ink shadow-[inset_0_0_0_3px_#f1f1ef]" : "border-slate bg-white"}`} aria-hidden="true" />
                      <span>
                        <span className="block font-display text-xl leading-tight text-ink">Enviar</span>
                        <span className="mt-1 block text-sm text-ink-deep">A la dirección que nos indiques.</span>
                      </span>
                    </label>
                  </div>
                </FormBlock>
                {fulfillment === "delivery" ? (
                  <label className="block text-sm text-ink">
                    Dirección
                    <textarea required minLength={8} maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} className={fieldClass} rows={3} placeholder="Calle, número, colonia" />
                  </label>
                ) : (
                  <div className="border border-sand bg-white p-4 text-sm">
                    <p>El cobro es en efectivo o por transferencia al recoger.</p>
                    <div className="mt-3">
                      <StoreInfo />
                    </div>
                  </div>
                )}
                <label className="block text-sm text-ink">
                  Nota
                  <textarea maxLength={400} value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} rows={2} placeholder="Alergias, dedicatoria o algún detalle" />
                </label>
                {fulfillment === "delivery" ? (
                  <p className="border border-sand bg-white p-4 text-sm leading-relaxed text-ink-deep">
                    El envío se paga por transferencia. Al hacerla, envía el pedido por WhatsApp junto con el comprobante.
                  </p>
                ) : null}
              </div>
              <div className="border-t border-sand bg-paper px-5 py-4">
                {error ? <p role="alert" className="mb-3 text-sm text-[#b4332a]">{error}</p> : null}
                <button type="submit" disabled={pending || !date || !time} className="w-full cursor-pointer rounded-full bg-ink px-5 py-3 text-paper disabled:cursor-not-allowed disabled:opacity-60">
                  {pending ? "Enviando…" : "Confirmar y abrir WhatsApp"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
