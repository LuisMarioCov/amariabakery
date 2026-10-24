import { formatMoney } from "../shared/catalog";

const moneyFont = { fontFamily: 'Arial, "Segoe UI", sans-serif' };

export function Price({ cents, className = "" }: { cents: number; className?: string }) {
  return (
    <span className={`price ${className}`.trim()} style={moneyFont}>
      {formatMoney(cents)}
    </span>
  );
}
