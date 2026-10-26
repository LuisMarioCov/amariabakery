import { STORE_ADDRESS, STORE_MAPS_URL } from "../shared/catalog";

export function StoreMapLink({ className = "underline", split = false }: { className?: string; split?: boolean }) {
  const breakAt = STORE_ADDRESS.indexOf(", Las Pergolas");
  const street = breakAt > 0 ? STORE_ADDRESS.slice(0, breakAt) : STORE_ADDRESS;
  const rest = breakAt > 0 ? STORE_ADDRESS.slice(breakAt + 2) : "";

  return (
    <a className={className} href={STORE_MAPS_URL} target="_blank" rel="noreferrer">
      {split && rest ? (
        <>
          {street}
          <br />
          {rest}
        </>
      ) : (
        STORE_ADDRESS
      )}
    </a>
  );
}
