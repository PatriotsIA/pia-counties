export type CampaignVideo = { id: string; title: string; kind: string; source: string };
export type SupportCampaign = {
  id: string; name: string; firstName: string; lastName: string; office: string; level: string;
  path: string; website: string; about: string; issues: string; privacy: string; disclosure: string;
  disclosureText: string; portrait: string; portraitSource: string; portraitPosition: string;
  slogan: string; quote: string; summary: string; priorities: { title: string; text: string }[];
  videos: CampaignVideo[]; videoArchive: string;
  /** Who the ads, landing pages and directory pins name as supporter and publisher. */
  supporter: string; publisher: string; publisherWebsite?: string;
};
export const notAuthorized = "Not authorized by any candidate or candidate’s committee.";
export const campaignAttribution = (c: SupportCampaign) =>
  `Published by ${c.publisher}.${c.publisherWebsite ? ` ${c.publisherWebsite}.` : ""} ${notAuthorized}`;
export const supportCampaigns: SupportCampaign[] = [
  {
    id: "greg-abbott", name: "Greg Abbott", firstName: "Greg", lastName: "Abbott", office: "Texas Governor", level: "state",
    path: "/greg-abbott", website: "https://www.gregabbott.com/",
    about: "https://www.gregabbott.com/about-texas-governor-greg-abbott/", issues: "https://www.gregabbott.com/policy/",
    privacy: "https://www.gregabbott.com/privacy-policy/",
    disclosure: "https://www.gregabbott.com/new-ad-protect-texans-vote-greg-abbott/#footer-info",
    disclosureText: "Political Ad paid for by Texans for Greg Abbott, PO Box 308, Austin, TX 78767.",
    portrait: "/campaigns/greg-abbott/portrait.webp",
    portraitSource: "https://www.gregabbott.com/about-texas-governor-greg-abbott/", portraitPosition: "50% 22%",
    slogan: "Stronger Texas. Brighter Tomorrow.",
    quote: "our lives are not defined by our challenges, but by how we respond to them.",
    summary: "Greg Abbott is seeking another term as governor of Texas. His campaign highlights his experience as governor, attorney general, and a justice on the Texas Supreme Court, with priorities spanning affordability, public safety, and education.",
    priorities: [
      { title: "Affordability", text: "The campaign proposes reducing property taxes and addressing the cost of housing, healthcare, insurance, and energy." },
      { title: "Public safety", text: "The campaign emphasizes support for law enforcement, border security, and keeping violent offenders behind bars." },
      { title: "Education", text: "The campaign highlights parental involvement, school choice, and preparing students for careers." },
    ],
    videos: [
      { id: "CTrxQ9A6KjE", title: "Meet Greg Abbott", kind: "Campaign biography", source: "https://www.gregabbott.com/about-texas-governor-greg-abbott/" },
      { id: "8-QicBM2Sgo", title: "Protect Texans. Vote Greg Abbott.", kind: "Campaign ad", source: "https://www.gregabbott.com/new-ad-protect-texans-vote-greg-abbott/" },
      { id: "G227zi40DOg", title: "Get Out the Vote event in Hutto", kind: "Campaign event", source: "https://www.gregabbott.com/" },
      { id: "9szd5w0eXgc", title: "Get Out the Vote event in Lindale", kind: "Campaign event", source: "https://www.gregabbott.com/" },
    ],
    videoArchive: "https://www.gregabbott.com/media-news/",
    supporter: "Patriots for Action",
    publisher: "Patriots Connect, LLC, d/b/a Patriots in Action", publisherWebsite: "PatriotsInAction.com",
  },
  {
    id: "ken-paxton", name: "Ken Paxton", firstName: "Ken", lastName: "Paxton", office: "U.S. Senate · Texas", level: "federal",
    path: "/ken-paxton", website: "https://www.kenpaxton.com/", about: "https://www.kenpaxton.com/about", issues: "https://www.kenpaxton.com/issues",
    privacy: "https://www.kenpaxton.com/privacy", disclosure: "https://www.kenpaxton.com/#1688150339",
    disclosureText: "Paid for by Ken Paxton For Senate",
    portrait: "/campaigns/ken-paxton/portrait.webp", portraitSource: "https://www.kenpaxton.com/", portraitPosition: "100% 24%",
    slogan: "Unshakable. Unbroken. Unafraid.",
    quote: "From the courtroom to the Capitol, Ken Paxton has never stopped fighting for Texas — and he’s just getting started.",
    summary: "Ken Paxton is running for the U.S. Senate in Texas. His campaign draws on his service as Texas attorney general and in the Texas Legislature, emphasizing constitutional liberties, border security, and limits on federal power.",
    priorities: [
      { title: "Border security", text: "The campaign supports completing the border wall and enforcing immigration law." },
      { title: "Healthcare accountability", text: "The campaign calls for greater transparency in food and healthcare, and accountability for pharmaceutical and food companies." },
      { title: "Taxes & spending", text: "The campaign advocates lower taxes, reduced federal spending, and fewer restrictions on energy production." },
    ],
    videos: [
      { id: "U5M2JTK5Jys", title: "One-on-one at the U.S. Hispanic Business Council", kind: "Interview · campaign channel", source: "https://www.youtube.com/user/KenPaxtonTX" },
      { id: "rvyc5K1Kbv4", title: "Sean Hannity Radio Show", kind: "Interview · campaign channel", source: "https://www.youtube.com/user/KenPaxtonTX" },
      { id: "bjz7cYuBWho", title: "The Big Take with Ed Henry", kind: "Interview · campaign channel", source: "https://www.youtube.com/user/KenPaxtonTX" },
      { id: "9RUJdj83quk", title: "Remarks at the Cypress rally", kind: "Campaign event", source: "https://www.youtube.com/user/KenPaxtonTX" },
    ],
    videoArchive: "https://www.youtube.com/user/KenPaxtonTX",
    supporter: "GOP Connect", publisher: "GOP Connect LLC",
  },
];
export const campaignBannerAdIds = supportCampaigns.map(c => `${c.id}-banner`);

export function campaignLink(campaign: SupportCampaign, destination: string, content: string) {
  const url = new URL(destination);
  url.searchParams.set("utm_source", "patriotsinaction");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", `vote_${campaign.id.replaceAll("-", "_")}_2026`);
  url.searchParams.set("utm_content", content);
  return url.toString();
}
export function campaignAdLink(campaign: SupportCampaign, format: "square" | "banner") {
  return `${campaign.path}?pia_ad=${campaign.id}-${format}`;
}
export function filterSupportCampaigns(search = "", state = "all", level = "all") {
  return supportCampaigns.filter(c => (state === "all" || state === "texas") && (level === "all" || c.level === level)
    && `${c.name} ${c.office} Texas Republican`.toLowerCase().includes(search.trim().toLowerCase()));
}
