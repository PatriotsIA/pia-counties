import { Link } from "react-router-dom";
import { AdSlot } from "./AdSlot";
import { campaignAttribution, filterSupportCampaigns, supportCampaigns } from "../data/campaigns";
import "./CampaignLandingPage.css";

export function PinnedSupportCandidates({ search, state, level }: { search: string; state: string; level: string }) {
  const campaigns = filterSupportCampaigns(search, state, level);
  if (!campaigns.length) return null;
  return <section className="campaign-pins" aria-labelledby="campaign-pins-heading"><div className="campaign-pins-heading"><h2 id="campaign-pins-heading">Pinned by Patriots in Action</h2></div><div className="campaign-pin-grid">{campaigns.map(c => <article className="campaign-pin" key={c.id}><img src={c.portrait} alt={c.name} style={{ objectPosition: c.portraitPosition }} width="135" height="190" /><div><p className="eyebrow">{c.supporter} supports · Republican</p><h3>{c.name}</h3><p>{c.office}</p><Link to={`${c.path}?pia_source=candidate_directory`}>Meet {c.firstName} &amp; view campaign →</Link><p className="campaign-pin-attribution">{campaignAttribution(c)}</p></div></article>)}</div></section>;
}
export function CampaignSupportAds() {
  return <section className="campaign-support-ads campaign-support-square" aria-label="Candidate and partner ads"><div className="campaign-support-squares">{supportCampaigns.map(c => <AdSlot key={c.id} slot="campaign-support-square" route="home" adIds={[`${c.id}-square`]} />)}<AdSlot slot="campaign-support-square" route="home" adIds={["recover-america-square"]} /></div></section>;
}
