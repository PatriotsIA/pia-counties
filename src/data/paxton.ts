import { supportCampaigns } from "./campaigns";

export const paxtonCampaign = supportCampaigns.find(c => c.id === "ken-paxton")!;
export const paxtonVideo = {
  source: "https://www.facebook.com/watch/?v=1137628245392101",
  poster: "/campaigns/ken-paxton/big-texan.webp",
  opening: "https://d2mwhhov0un9j4.cloudfront.net/paxton/big-texan-opening-7m33s-v1.mp4",
  full: "https://d2mwhhov0un9j4.cloudfront.net/paxton/big-texan-full-v1.mp4",
};

// Completed results, with Texas-specific amounts and dated primary sources.
export const paxtonAccomplishments = [
  {
    title: "$1.4 billion Meta privacy settlement",
    date: "July 30, 2024", category: "Texans’ privacy",
    text: "Paxton’s office secured a $1.4 billion settlement with Meta over its capture and use of Texans’ biometric data without the consent required by state law. The agreement calls for payments to Texas over five years.",
    source: "https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-secures-14-billion-settlement-meta-over-its-unauthorized-capture",
  },
  {
    title: "$1.375 billion Google privacy settlement",
    date: "October 31, 2025", category: "Big Tech accountability",
    text: "His office finalized a $1.375 billion agreement with Google resolving Texas lawsuits over the collection of location data, private browsing activity, and biometric identifiers.",
    source: "https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-finalizes-historic-settlement-google-and-secures-1375-billion-big-tech",
  },
  {
    title: "$1.167 billion for Texas in opioid settlements",
    date: "February 16, 2022", category: "Treatment & recovery",
    text: "Working with other state attorneys general and Texas local governments, Paxton secured a $1.167 billion Texas share of the national opioid agreement with Cardinal, McKesson, and AmerisourceBergen to help communities address the opioid crisis.",
    source: "https://www.texasattorneygeneral.gov/news/releases/paxton-secures-1167-billion-texas-global-opioid-agreement",
  },
  {
    title: "A dedicated human trafficking unit",
    date: "January 14, 2016", category: "Public safety",
    text: "Paxton announced a dedicated Human Trafficking and Transnational Organized Crime unit in the attorney general’s office, bringing together investigators, prosecutors, a forensic accountant, and a victims’ advocate to investigate trafficking and assist victims.",
    source: "https://www.texasattorneygeneral.gov/news/releases/ag-paxton-announces-new-agency-human-trafficking-unit",
  },
  {
    title: "Stronger protections for hotel guests’ data",
    date: "October 9, 2024", category: "Consumer protection",
    text: "A multistate Marriott settlement secured $3.5 million for Texas and required stronger security practices, executive oversight, and employee training following a breach of guest records.",
    source: "https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-reaches-35-million-settlement-following-investigation-marriotts-breach",
  },
  {
    title: "Preserving child support operations",
    date: "June 4, 2024", category: "Texas families",
    text: "After Texas challenged IRS restrictions on contractor access to child support data and submitted a technology mitigation plan, the IRS said it would not take action against Texas in light of its upgrades. Paxton’s office then voluntarily dismissed the lawsuit.",
    source: "https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-successfully-stops-unlawful-attempt-biden-irs-impair-texas-child-support",
  },
];
