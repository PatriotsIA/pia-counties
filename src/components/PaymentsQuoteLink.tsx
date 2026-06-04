import { Link } from "react-router-dom";
import { paymentsQuotePath } from "../data/ad-pricing";

type PaymentsQuoteLinkProps = {
  tierName?: string;
  className?: string;
  label?: string;
};

export function PaymentsQuoteLink({ tierName, className = "button primary", label = "Get a quote" }: PaymentsQuoteLinkProps) {
  const search = tierName ? `?subject=${encodeURIComponent(`Partner quote: ${tierName}`)}` : "";
  return (
    <Link className={className} to={`${paymentsQuotePath}${search}`}>
      {label}
    </Link>
  );
}
