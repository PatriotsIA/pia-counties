import type { AdCreative } from "./ads";
import { campaignBannerAdIds } from "./campaigns";

export const featuredBannerAdIds = [...campaignBannerAdIds, "recover-america-banner"];

// Explicit placements append this partner message without changing paid inventory.
export const recoverAmericaAds: AdCreative[] = (["square", "banner"] as const).map(format => ({
  id: `recover-america-${format}`,
  campaignId: "pia-partner-recover-america-2026",
  sponsor: "Recover America",
  title: "Meet Recover America",
  body: "Explore the mission and the Protect Children pledge. A Patriots in Action partner.",
  cta: "Meet Recover America",
  href: `/recover-america?pia_ad=recover-america-${format}`,
  placement: format === "banner" ? "leaderboard" : "compact",
  display: "image-only",
  image: {
    desktop: `/partners/recover-america/${format}.webp`,
    mobile: "/partners/recover-america/square.webp",
    alt: "Recover America. A voice for families. Explore the mission and the Protect Children pledge. A Patriots in Action partner. Meet Recover America.",
  },
  priority: 100,
  active: true,
  targeting: { slots: [] },
}));
