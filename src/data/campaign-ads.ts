import type { AdCreative } from "./ads";
import { campaignAdLink, campaignAttribution, supportCampaigns } from "./campaigns";

// Explicit support placements preserve the existing paid sponsor rotations.
export const campaignSupportAds: AdCreative[] = supportCampaigns.flatMap(c => (["square", "banner"] as const).map(format => ({
  id: `${c.id}-${format}`, campaignId: `pia-support-${c.id}-2026`, sponsor: c.supporter,
  title: `Vote ${c.name}`, body: campaignAttribution(c), cta: `Meet ${c.name}`, href: campaignAdLink(c, format),
  placement: format === "banner" ? "leaderboard" : "compact", display: "image-only",
  image: { desktop: `/campaigns/${c.id}/${format}.webp`, mobile: `/campaigns/${c.id}/square.webp`, alt: `Vote ${c.name} for ${c.office}. ${campaignAttribution(c)} View campaign information.` },
  priority: 100, active: true, targeting: { slots: [] },
})));
