import { useEffect, useId, useState } from "react";
import { TicketView } from "./TicketView";
import { lockPageScroll } from "../lib/scroll-lock";
import { formatSchedule, statusLabel, type Order, type OrderStatus } from "../shared/catalog";
import { Price } from "./Price";

const columns: { status: OrderStatus; title: string; tone: string }[] = [
  { status: "nuevo", title: "Nuevo", tone: "bg-[#d0dce9]" },
  { status: "en_preparacion", title: "En preparación", tone: "bg-[#f3e6cf]" },
  { status: "listo", title: "Listo", tone: "bg-[#dce8df]" },
];

export function OrderBoard({
  orders,
  onStatus,
  onDelete,
}: {
  orders: Order[];
  onStatus: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const titleId = useId();

  useEffect(() => {
    if (!selected) return;
    const unlock = lockPageScroll();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  return (
    <div>
      {orders.length === 0 ? <p className="mt-4">Todavía no hay pedidos.</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const cards = orders.filter((order) => order.status === column.status);
          return (
            <section key={column.status} className={`min-h-48 p-3 ${column.tone}`} aria-labelledby={`columna-${column.status}`}>
              <h3 id={`columna-${column.status}`} className="flex items-center justify-between font-display text-2xl text-ink">
                {column.title}
                <span className="price text-base">{cards.length}</span>
              </h3>
              <ul className="mt-3 space-y-3">
                {cards.map((order) => (
                  <li key={order.id} className="relative bg-white">
                    <button type="button" className="w-full cursor-pointer p-3 pr-12 text-left" onClick={() => { setArmedId(null); setSelectedId(order.id); }}>
                      <span className="price text-sm text-ink-deep">{order.publicCode}</span>
                      <span className="mt-1 block font-display text-xl text-ink">{order.customerName}</span>
                      {order.scheduledDate && order.scheduledTime ? (
                        <span className="mt-1 block text-sm text-ink-deep">{formatSchedule(order.scheduledDate, order.scheduledTime)}</span>
                      ) : null}
                      <span className="mt-1 flex items-center justify-between gap-2 text-sm">
                        <span>
                          {order.fulfillment === "delivery" ? "Envío" : "Recoger"}
                          {order.paymentMethod === "transferencia" ? " · Transferencia" : order.paymentMethod === "tienda" ? " · En tienda" : ""}
                        </span>
                        <Price cents={order.totalCents} />
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`absolute top-2 right-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-[#f3c9c6] text-[#6b3330] ${armedId === order.id ? "ring-2 ring-[#6b3330]" : ""}`}
                      aria-label={armedId === order.id ? `Confirmar borrar pedido ${order.publicCode}` : `Borrar pedido ${order.publicCode}`}
                      aria-pressed={armedId === order.id}
                      onClick={() => {
                        if (armedId !== order.id) {
                          setArmedId(order.id);
                          return;
                        }
                        setArmedId(null);
                        if (selectedId === order.id) setSelectedId(null);
                        onDelete(order.id);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {selected ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#243e52]/45 p-3 sm:items-center" onClick={() => setSelectedId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto bg-paper p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id={titleId} className="sr-only">
                Pedido {selected.publicCode}
              </h3>
              <button type="button" className="ml-auto cursor-pointer rounded-full border border-ink px-4 py-2 text-ink" onClick={() => setSelectedId(null)}>
                Cerrar
              </button>
            </div>
            <div className="mt-3">
              <TicketView order={selected} />
            </div>
            <div className="mx-auto mt-4 flex max-w-sm flex-wrap gap-2">
              {columns.map((column) => (
                <button
                  key={column.status}
                  type="button"
                  className={`cursor-pointer rounded-full px-4 py-2 ${selected.status === column.status ? "bg-ink text-paper" : "border border-sand bg-white text-ink"}`}
                  onClick={() => onStatus(selected.id, column.status)}
                >
                  {statusLabel(column.status)}
                </button>
              ))}
            </div>
            {selected.ticketToken ? (
              <div className="mx-auto mt-4 flex max-w-sm flex-wrap gap-2">
                <a className="rounded-full bg-ink px-5 py-3 text-paper" href={`/pedido/${selected.ticketToken}`}>
                  Ver ticket
                </a>
                <a className="rounded-full border border-ink px-5 py-3 text-ink" href={`/api/admin/orders/${selected.id}/pdf`}>
                  Descargar PDF
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}
