import { STORE_ADDRESS, STORE_MAPS_URL } from "../shared/catalog";

export function StoreMapLink({ className = "underline" }: { className?: string }) {
  return (
    <a className={className} href={STORE_MAPS_URL} target="_blank" rel="noreferrer">
      {STORE_ADDRESS}
    </a>
  );
}
