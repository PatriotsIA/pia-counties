import pia980Banner from "../../NewAds/PIA980.jpg";

const communityUrl = "https://community.patriotsinaction.com/";

export function PatriotNetworkCommunityBanner() {
  return (
    <section className="patriot-network-community-banner" aria-label="Join your county Patriot Network">
      <a className="patriot-network-community-banner-image" href={communityUrl} target="_blank" rel="noopener noreferrer">
        <img src={pia980Banner} alt="" loading="lazy" />
      </a>
      <div className="patriot-network-community-banner-copy">
        <div className="patriot-network-community-banner-text">
          <h2>Join Your County&apos;s Patriot Network</h2>
          <p>Connect with neighbors, share local events, and stay ready for practical civic action.</p>
        </div>
        <a className="button red patriot-network-community-banner-cta" href={communityUrl} target="_blank" rel="noopener noreferrer">
          Join the Movement
        </a>
      </div>
    </section>
  );
}
