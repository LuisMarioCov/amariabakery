import { formatFlavorCounts, formatSchedule, paymentSentence, type Order } from "../shared/catalog";
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
    <article className="mx-auto max-w-sm bg-white px-7 py-8 text-ink-deep">
      <img src="/brand/logo-seal.webp" alt="" width="160" height="155" className="mx-auto h-14 w-auto" />
      <p className="mt-4 text-center font-display text-3xl text-ink">Amaría</p>
      <p className="price mt-2 text-center text-lg text-ink">{order.publicCode}</p>
      <p className="mt-1 text-center text-sm text-slate">{when}</p>

      <div className="mt-8 space-y-5 text-sm leading-relaxed">
        <div>
          <p className="text-slate">Cliente</p>
          <p className="mt-1 text-base text-ink">{order.customerName}</p>
          <p className="price">{order.customerPhone}</p>
        </div>
        {order.scheduledDate && order.scheduledTime ? (
          <div>
            <p className="text-slate">Para</p>
            <p className="mt-1 text-base">{formatSchedule(order.scheduledDate, order.scheduledTime)}</p>
          </div>
        ) : null}
        <div>
          <p className="text-slate">Entrega</p>
          {deliveryAddress ? (
            <p className="mt-1 text-base">{deliveryAddress}</p>
          ) : (
            <>
              <p className="mt-1 text-base">Recoger en el local</p>
              <p className="mt-1">
                <StoreMapLink split />
              </p>
            </>
          )}
        </div>
      </div>

      <ul className="mt-8 space-y-4 border-t border-sand pt-5">
        {order.items.map((item) => (
          <li key={`${item.productId}-${item.productName}-${item.lineTotalCents}`}>
            <p className="flex items-baseline justify-between gap-4 text-base">
              <span>
                {item.quantity} × {item.productName}
              </span>
              <Price cents={item.lineTotalCents} />
            </p>
            {item.gift !== null || item.flavors.length > 0 ? (
              <p className="mt-1 text-sm text-slate">
                {item.gift === null ? "" : item.gift ? "Regalo" : "Sin regalo"}
                {item.gift !== null && item.flavors.length > 0 ? " · " : ""}
                {item.flavors.length > 0 ? formatFlavorCounts(item.flavors) : ""}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-baseline justify-between border-t border-sand pt-5">
        <span className="font-display text-2xl text-ink">Total</span>
        <Price cents={order.totalCents} className="text-2xl text-ink" />
      </p>
      {order.note ? <p className="mt-5 text-sm leading-relaxed">Nota: {order.note}</p> : null}
      <p className="mt-4 text-sm leading-relaxed">{paymentSentence(order.paymentMethod, order.fulfillment)}</p>
    </article>
  );
}
