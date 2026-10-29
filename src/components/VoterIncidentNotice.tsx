import "./VoterIncidentNotice.css";

export function VoterIncidentNotice() {
  return <section className="voter-incident-notice" aria-labelledby="voter-incident-heading">
    <div className="voter-incident-copy">
      <p className="voter-incident-kicker">Texas voter incident report</p>
      <h2 id="voter-incident-heading">In Texas and having issues with a voting machine changing your vote? Fill out this form</h2>
      <p className="voter-incident-instructions"><strong>Instructions from the form:</strong> Complete in ink in your own words. Describe only what you personally observed and did. <strong>DO NOT sign until in the presence of a Notary Public</strong> (valid photo ID required). Free notary service is available at GOP HQ (call to verify availability). Warning: A false statement made under oath constitutes Perjury under Texas Penal Code § 37.02.</p>
      <p className="voter-incident-source">Form source: Potter County Republican Party · 4217 SW 21st Ave., Amarillo, TX 79106 · <a href="tel:+18063510884">(806) 351-0884</a></p>
    </div>
    <a className="voter-incident-download" href="/forms/Voter_Affidavit_Incident_Report.docx" download="Voter_Affidavit_Incident_Report.docx">Download the form <span>Word document (.docx)</span></a>
  </section>;
}
