import type { AdCreative } from "./ads";
import { campaignAdLink, supportAttribution, supportCampaigns } from "./campaigns";

// Explicit support placements preserve the existing paid sponsor rotations.
export const campaignSupportAds: AdCreative[] = supportCampaigns.flatMap(c => (["square", "banner"] as const).map(format => ({
  id: `${c.id}-${format}`, campaignId: `pia-support-${c.id}-2026`, sponsor: "Patriots in Action",
  title: `Vote ${c.name}`, body: supportAttribution, cta: `Meet ${c.name}`, href: campaignAdLink(c, format),
  placement: format === "banner" ? "leaderboard" : "compact", display: "image-only",
  image: { desktop: `/campaigns/${c.id}/${format}.webp`, mobile: `/campaigns/${c.id}/square.webp`, alt: `Vote ${c.name} for ${c.office}. ${supportAttribution} View campaign information.` },
  priority: 100, active: true, targeting: { slots: [] },
})));
