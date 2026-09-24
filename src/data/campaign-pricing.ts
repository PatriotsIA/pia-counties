export type CountyRateTier = {
  population: string;
  colorCardMonthly: number;
  sectionSponsorMonthly: number;
};

export type CampaignScope = "county" | "state";
export type CountyPlacement = "color-card" | "section-sponsorship";
export type StatePlacement = "state-ad" | "state-feed-sponsorship";
export type BillingCadence = "monthly" | "annual";
export type SponsorableFeed = "community-updates" | "community-calendar" | "pia-tv" | "elections-resources" | "weather";

export const countyRateTiers: CountyRateTier[] = [
  { population: "Under 5,000", colorCardMonthly: 25, sectionSponsorMonthly: 50 },
  { population: "5,000–19,999", colorCardMonthly: 75, sectionSponsorMonthly: 150 },
  { population: "20,000–99,999", colorCardMonthly: 150, sectionSponsorMonthly: 300 },
  { population: "100,000–249,999", colorCardMonthly: 250, sectionSponsorMonthly: 500 },
  { population: "250,000–499,999", colorCardMonthly: 400, sectionSponsorMonthly: 800 },
  { population: "500,000–749,999", colorCardMonthly: 550, sectionSponsorMonthly: 1100 },
  { population: "750,000–999,999", colorCardMonthly: 750, sectionSponsorMonthly: 1500 },
  { population: "1,000,000–2,499,999", colorCardMonthly: 1000, sectionSponsorMonthly: 2000 },
  { population: "2,500,000 and above", colorCardMonthly: 1250, sectionSponsorMonthly: 2500 },
];

export const sponsorableFeeds: Array<{ key: SponsorableFeed; label: string }> = [
  { key: "community-updates", label: "Community updates" },
  { key: "community-calendar", label: "Community calendar" },
  { key: "pia-tv", label: "PIA TV" },
  { key: "elections-resources", label: "Elections & resources" },
  { key: "weather", label: "Weather" },
];

export const STATE_AD_RATE_PER_COUNTY = 10;
export const STATE_FEED_SPONSOR_RATE_PER_COUNTY = 20;
export const ANNUAL_BILLED_MONTHS = 10;

export function monthlyCountyPlacementPrice(population: number, placement: CountyPlacement) {
  const tier =
    population < 5_000
      ? countyRateTiers[0]
      : population < 20_000
        ? countyRateTiers[1]
        : population < 100_000
          ? countyRateTiers[2]
          : population < 250_000
            ? countyRateTiers[3]
            : population < 500_000
              ? countyRateTiers[4]
              : population < 750_000
                ? countyRateTiers[5]
                : population < 1_000_000
                  ? countyRateTiers[6]
                  : population < 2_500_000
                    ? countyRateTiers[7]
                    : countyRateTiers[8];
  return placement === "color-card" ? tier.colorCardMonthly : tier.sectionSponsorMonthly;
}

export function monthlyStatePlacementPrice(countyCount: number, placement: StatePlacement, feedCount = 0) {
  if (placement === "state-ad") return countyCount * STATE_AD_RATE_PER_COUNTY;
  return countyCount * STATE_FEED_SPONSOR_RATE_PER_COUNTY * feedCount;
}

export function checkoutPrice(monthlyPrice: number, billing: BillingCadence) {
  return billing === "annual" ? monthlyPrice * ANNUAL_BILLED_MONTHS : monthlyPrice;
}

export function formatAdPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function countyCampaignMonthly(populations: number[], placement: CountyPlacement) {
  const cents = populations.map((population) => monthlyCountyPlacementPrice(population, placement) * 100).sort((a, b) => b - a);
  return cents.reduce((sum, rate, index) => sum + (index === 0 ? rate : Math.round(rate / 2)), 0) / 100;
}
