import { Link } from "react-router-dom";
import { AdSlot } from "./AdSlot";
import { filterSupportCampaigns, supportCampaigns, supportAttribution } from "../data/campaigns";
import "./CampaignLandingPage.css";

export function PinnedSupportCandidates({ search, state, level }: { search: string; state: string; level: string }) {
  const campaigns = filterSupportCampaigns(search, state, level);
  if (!campaigns.length) return null;
  return <section className="campaign-pins" aria-labelledby="campaign-pins-heading"><div className="campaign-pins-heading"><h2 id="campaign-pins-heading">Pinned by Patriots in Action</h2><p>{supportAttribution}</p></div><div className="campaign-pin-grid">{campaigns.map(c => <article className="campaign-pin" key={c.id}><img src={c.portrait} alt={c.name} style={{ objectPosition: c.portraitPosition }} width="135" height="190" /><div><p className="eyebrow">PIA supports · Republican</p><h3>{c.name}</h3><p>{c.office}</p><Link to={`${c.path}?pia_source=candidate_directory`}>Meet {c.firstName} &amp; view campaign →</Link></div></article>)}</div></section>;
}
export function CampaignSupportAds({ format = "banner" }: { format?: "banner" | "square" }) {
  return <section className={`campaign-support-ads campaign-support-${format}`} aria-label="Unpaid PIA candidate support messages"><p>{supportAttribution}</p>{format === "square" ? <div className="campaign-support-squares">{supportCampaigns.map(c => <AdSlot key={c.id} slot="campaign-support-square" route="home" adIds={[`${c.id}-square`]} />)}</div> : <AdSlot slot="campaign-support-banner" route="static" limit={2} adIds={supportCampaigns.map(c => `${c.id}-banner`)} />}</section>;
}
