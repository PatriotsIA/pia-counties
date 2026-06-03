type PresentedByPartnerProps = {
  name: string;
  href: string;
  image?: string;
  className?: string;
};

export function PresentedByPartner({ name, href, image, className }: PresentedByPartnerProps) {
  const linkClassName = ["feed-presented-by", className].filter(Boolean).join(" ");

  return (
    <a className={linkClassName} href={href} target="_blank" rel="noreferrer">
      {image ? <img src={image} alt="" loading="lazy" /> : null}
      <span>Presented by</span>
      <strong>{name}</strong>
    </a>
  );
}
