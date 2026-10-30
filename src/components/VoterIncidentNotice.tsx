import "./VoterIncidentNotice.css";

export function VoterIncidentNotice() {
  return <section className="voter-incident-notice" aria-labelledby="voter-incident-heading">
    <div className="voter-incident-copy">
      <p className="voter-incident-kicker">Voter Incident Report</p>
      <h2 id="voter-incident-heading">Did the review screen or printed ballot not match your selection? Report what you saw on this sworn form.</h2>
    </div>
    <a className="voter-incident-download" href="/forms/Voter_Affidavit_Incident_Report.pdf" download="Voter_Affidavit_Incident_Report.pdf">Download the form <span>PDF document (.pdf)</span></a>
  </section>;
}
