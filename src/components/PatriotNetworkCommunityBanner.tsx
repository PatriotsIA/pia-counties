import { site } from "../data/site";

const communityUrl = "https://community.patriotsinaction.com/";

type PatriotNetworkCommunityBannerProps = {
  className?: string;
};

export function PatriotNetworkCommunityBanner({ className }: PatriotNetworkCommunityBannerProps = {}) {
  const sectionClassName = ["patriot-network-community-banner", className].filter(Boolean).join(" ");

  return (
    <section className={sectionClassName} aria-label="Join your county Patriot Network">
      <a className="patriot-network-community-banner-icon" href={communityUrl} target="_blank" rel="noopener noreferrer">
        <img src={site.brand.icon} alt={site.name} loading="lazy" />
      </a>
      <div className="patriot-network-community-banner-copy">
        <div className="patriot-network-community-banner-text">
          <h2>Join Your County&apos;s Patriot Network</h2>
          <p>
            Connect with neighbors, share local events, and stay ready for practical civic action. Join to Learn &lsquo;How to Be a Patriot
            In Action. How to move from inaction to action.&rsquo;
          </p>
          <p>Access exclusive candidate and official interviews, educational resources, community town square/forums, etc.</p>
        </div>
        <a className="button red patriot-network-community-banner-cta" href={communityUrl} target="_blank" rel="noopener noreferrer">
          Join the Movement
        </a>
      </div>
    </section>
  );
}
