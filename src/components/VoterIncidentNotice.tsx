import { Link } from "react-router-dom";
import "./VoterIncidentNotice.css";

export function VoterIncidentNotice({ showMidterms = false }: { showMidterms?: boolean }) {
  return <>
  <section className="voter-incident-notice lawsuit-notice" aria-labelledby="lawsuit-notice-heading">
    <div className="voter-incident-copy">
      <h2 id="lawsuit-notice-heading">{"See the GOP's Lawsuit to Verify The Election Count"}</h2>
    </div>
    <a className="lawsuit-notice-button" href="https://mylocalgop.com/tx/potter/statement/?utm_source=patriotsinaction&utm_medium=referral&utm_campaign=gop_lawsuit_2026&utm_content=lawsuit_banner" target="_blank" rel="noreferrer">Read the Lawsuit</a>
  </section>
  {showMidterms && <section className="voter-incident-notice midterms-notice" aria-labelledby="midterms-notice-heading">
    <div className="voter-incident-copy">
      <p className="voter-incident-kicker">2026 Midterms · Potter County GOP</p>
      <h2 id="midterms-notice-heading">We Held the Line. Now the Work Starts.</h2>
      <p className="voter-incident-source">A press release from Chairman Dan Rogers · November 4, 2026</p>
    </div>
    <Link className="voter-incident-download" to="/tx/potter/2026-midterms">Read the Press Release</Link>
  </section>}
  <section className="voter-incident-notice" aria-labelledby="voter-incident-heading">
    <div className="voter-incident-copy">
      <p className="voter-incident-kicker">Voter Incident Report</p>
      <h2 id="voter-incident-heading">Did the review screen or printed ballot not match your selection? Report what you saw on this sworn form.</h2>
      <a className="voter-incident-statement" href="https://thecountypost.com/gop?utm_source=patriotsinaction&utm_medium=referral&utm_campaign=gop_lawsuit_2026&utm_content=certification_link" target="_blank" rel="noreferrer">Learn More About the 2026 Mid Term Election Certification</a>
    </div>
    <a className="voter-incident-download" href="/forms/Voter_Affidavit_Incident_Report.pdf" download="Voter_Affidavit_Incident_Report.pdf">Download the form <span>PDF document (.pdf)</span></a>
  </section>
  </>;
}
