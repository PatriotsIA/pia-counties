import { SiteImage } from "./SiteImage";
import patriotAnimationUrl from "../../PatriotAnimation.gif";

type LoadingIndicatorProps = {
  label?: string;
  inline?: boolean;
};

export function LoadingIndicator({ label = "Loading", inline = false }: LoadingIndicatorProps) {
  return (
    <span
      className={`loading-indicator${inline ? " loading-indicator-inline" : ""}`}
      role="status"
      aria-live="polite"
    >
      <SiteImage loading="eager" sizes="80px" src={patriotAnimationUrl} alt="" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
