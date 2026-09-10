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
      <img src={patriotAnimationUrl} alt="" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
