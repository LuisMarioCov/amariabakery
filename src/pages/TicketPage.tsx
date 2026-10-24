import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TicketView } from "../components/TicketView";
import { ApiError } from "../lib/api";
import type { Order } from "../shared/catalog";

export function TicketPage() {
  const { token } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`/api/tickets/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as (Order & { error?: string }) | null;
        if (!response.ok) throw new ApiError(body?.error ?? "No encontramos ese ticket", response.status);
        setOrder(body);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "No encontramos ese ticket");
      });
    return () => controller.abort();
  }, [token]);

  const pdf = token ? `/api/tickets/${encodeURIComponent(token)}/pdf` : "";

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link to="/" className="text-sm underline">
        Volver al menú
      </Link>
      {error ? <p className="mt-6" role="alert">{error}</p> : null}
      {!order && !error ? <p className="mt-6">Cargando ticket…</p> : null}
      {order ? (
        <div className="mt-6 space-y-4">
          <TicketView order={order} />
          <div className="flex flex-wrap gap-3">
            <a className="rounded-full bg-ink px-5 py-3 text-paper" href={pdf} target="_blank" rel="noreferrer">
              Ver PDF
            </a>
            <a className="rounded-full border border-ink px-5 py-3 text-ink" href={`${pdf}?descarga=1`}>
              Descargar PDF
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
