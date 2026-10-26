import { useEffect, useState } from "react";
import { STORE_HOURS, storeStatus } from "../shared/catalog";
import { StoreMapLink } from "./StoreMapLink";

export function StoreInfo() {
  const [status, setStatus] = useState(() => storeStatus());

  useEffect(() => {
    const timer = window.setInterval(() => setStatus(storeStatus()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-1 text-sm">
      <p>
        <StoreMapLink />
      </p>
      <p>{STORE_HOURS}</p>
      <p>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs text-white ${status.open ? "bg-[#1b7f4a]" : "bg-[#b4332a]"}`}
          aria-live="polite"
        >
          {status.label}
        </span>
      </p>
    </div>
  );
}
