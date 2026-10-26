import { formatFlavorCounts, type Order } from "../shared/catalog";
import { Price } from "./Price";
import { StoreMapLink } from "./StoreMapLink";

export function TicketView({ order }: { order: Order }) {
  const when = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(order.createdAt));
  const deliveryAddress = order.fulfillment === "delivery" && order.address ? order.address : null;
  return (
    <article className="mx-auto max-w-sm bg-white px-6 py-7 text-sm text-ink-deep">
      <img src="/brand/logo-seal.webp" alt="" width="160" height="155" className="mx-auto h-16 w-auto" />
      <p className="mt-3 text-center font-display text-2xl tracking-wide text-ink">Amaría</p>
      <p className="mt-3 text-center">
        <span className="price text-ink">{order.publicCode}</span>
        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${statusTone(order.status)}`}>{statusWord(order.status)}</span>
      </p>
      <p className="mt-1 text-center text-xs text-slate">{when}</p>
      <p className="mt-5 text-center text-xs leading-5">
        {order.customerName}
        <span className="price"> · {order.customerPhone}</span>
        <br />
        {deliveryAddress ?? (
          <>
            Recoger en el local
            <br />
            <StoreMapLink />
          </>
        )}
      </p>
      <ul className="mt-5 space-y-3 border-t border-sand pt-4">
        {order.items.map((item) => (
          <li key={`${item.productId}-${item.productName}-${item.lineTotalCents}`}>
            <p className="flex items-baseline justify-between gap-4">
              <span>
                {item.quantity} × {item.productName}
              </span>
              <Price cents={item.lineTotalCents} />
            </p>
            {item.gift !== null || item.flavors.length > 0 ? (
              <p className="mt-0.5 text-xs text-slate">
                {item.gift === null ? "" : item.gift ? "Regalo" : "Sin regalo"}
                {item.gift !== null && item.flavors.length > 0 ? " · " : ""}
                {item.flavors.length > 0 ? formatFlavorCounts(item.flavors) : ""}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-baseline justify-between border-t border-sand pt-4">
        <span className="text-ink">Total</span>
        <Price cents={order.totalCents} className="text-lg text-ink" />
      </p>
      {order.note ? <p className="mt-3 text-center text-xs text-slate">Nota: {order.note}</p> : null}
      <p className="mt-4 text-center text-xs text-slate">
        {order.fulfillment === "delivery" ? "Transferencia. Envía el comprobante por WhatsApp." : "Efectivo o transferencia al recoger."}
      </p>
    </article>
  );
}

function statusWord(status: Order["status"]): string {
  if (status === "nuevo") return "Nuevo";
  if (status === "en_preparacion") return "Preparando";
  return "Listo";
}

function statusTone(status: Order["status"]): string {
  if (status === "nuevo") return "bg-[#d0dce9] text-ink-deep";
  if (status === "en_preparacion") return "bg-[#f3e6cf] text-ink-deep";
  return "bg-[#dce8df] text-ink-deep";
}
