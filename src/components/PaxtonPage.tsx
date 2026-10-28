import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { campaignAttribution, campaignLink } from "../data/campaigns";
import { paxtonAccomplishments, paxtonCampaign } from "../data/paxton";
import { AdSlot } from "./AdSlot";
import { PaxtonEventVideo } from "./PaxtonEventVideo";
import "./CampaignLandingPage.css";
import "./PaxtonPage.css";

export function PaxtonPage({ header }: { header: ReactNode }) {
  return <>{header}<div className="campaign-page paxton-page">
    <a className="campaign-skip" href="#paxton-main">Skip to content</a>
    <main id="paxton-main">
      <section className="paxton-intro">
        <div className="paxton-intro-inner">
          <p className="campaign-kicker">{paxtonCampaign.supporter} supports Ken Paxton</p>
          <h1>Ken Paxton.<br /><span>A record for Texas.</span></h1>
          <p className="paxton-deck">Watch the opening of the “Come and Take It” tour at The Big Texan, then explore accomplishments from his service as Texas attorney general.</p>
          <div className="campaign-actions"><a className="campaign-button" href="#paxton-video">Watch the opening 7:33 ↓</a><a className="campaign-button campaign-button-outline" href="#paxton-accomplishments">Explore his record ↓</a></div>
          <p className="campaign-attribution">{campaignAttribution(paxtonCampaign)}</p>
        </div>
      </section>
      <section className="campaign-section paxton-feature" id="paxton-video" aria-label="Event video and Vote Paxton message">
        <PaxtonEventVideo excerpt />
        <aside className="paxton-support"><AdSlot slot="campaign-support-square" route="static" adIds={["ken-paxton-square"]} /><h2>Vote Ken Paxton.</h2><p>Learn more about his campaign for the U.S. Senate.</p><Link to="/ken-paxton">Visit PIA’s Ken Paxton page →</Link></aside>
      </section>
      <section className="campaign-section paxton-record" id="paxton-accomplishments">
        <div className="campaign-section-heading"><div><p className="campaign-kicker">Service as Texas attorney general</p><h2>Accomplishments in office.</h2></div><span className="paxton-record-label">The record, with sources</span></div>
        <p className="paxton-record-intro">Selected results from Paxton’s tenure, documented by the Office of the Texas Attorney General. Dates below identify the official announcements; settlement amounts describe the agreements, not money already distributed.</p>
        <ol className="paxton-accomplishments">{paxtonAccomplishments.map((item, i) => <li key={item.title}>
          <span className="campaign-number">{String(i + 1).padStart(2, "0")}</span><p className="campaign-kicker">{item.category}</p><h3>{item.title}</h3><p>{item.text}</p><div className="paxton-record-source"><span>{item.date}</span><a href={campaignLink(paxtonCampaign, item.source, `accomplishment_${i + 1}`)} target="_blank" rel="noopener noreferrer">Read the official source ↗</a></div>
        </li>)}</ol>
      </section>
      <section className="campaign-cta"><p className="campaign-kicker">More from Ken Paxton</p><h2>Keep watching. Get involved.</h2><p>See the full Big Texan event, more interviews, and campaign information.</p><Link className="campaign-button" to="/ken-paxton#campaign-videos">Watch the full event →</Link></section>
    </main>
    <footer className="campaign-footer"><strong>{paxtonCampaign.supporter}</strong><p>{campaignAttribution(paxtonCampaign)}</p><div><Link to="/ken-paxton#campaign-disclosure">Campaign disclosures</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact PIA</Link></div></footer>
  </div></>;
}
