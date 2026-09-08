import { useState } from "react";
import { Link } from "react-router-dom";
import { getCandidateOfficeLevel, type Candidate } from "../data/candidates";
import { getCountiesForState, getStateBySlug } from "../data/counties";
import { candidateProjectCandidateIds, candidateProjectDisclaimer, candidateProjectUrl } from "../data/candidate-project";
import { candidateJurisdiction, candidateProfilePath } from "../lib/candidate-profile";

export function CandidateProjectDisclaimer({ preview = false }: { preview?: boolean }) {
  return (
    <p>
      {candidateProjectDisclaimer} <Link to="/terms" target={preview ? "_blank" : undefined} rel={preview ? "noreferrer" : undefined}>Terms</Link> and <Link to="/privacy" target={preview ? "_blank" : undefined} rel={preview ? "noreferrer" : undefined}>Privacy Policy</Link>.
    </p>
  );
}

export function CandidateProfile({ candidate, backPath, preview = false }: { candidate: Candidate; backPath: string; preview?: boolean }) {
  return (
    <article className="candidate-profile">
      <div className="candidate-profile-header">
        <div>
          <p className="eyebrow">Candidate Profile</p>
          <h1>{candidate.name}</h1>
          <p>For {candidate.office}</p>
        </div>
        <div className="actions">
          {preview ? <button className="button" type="button" disabled>Back to Candidates</button> : <Link className="button" to={backPath}>Back to Candidates</Link>}
          <ShareCandidateProfileButton candidate={candidate} disabled={preview} />
        </div>
      </div>
      <div className="candidate-profile-grid">
        <div className="candidate-profile-main">
          {candidate.videoEmbedUrl ? (
            <iframe
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              src={candidate.videoEmbedUrl}
              title={candidate.videoTitle || `${candidate.name} video`}
            />
          ) : candidate.image ? (
            <img src={candidate.image} alt={candidate.name} />
          ) : (
            <div className="candidate-profile-empty-video">No candidate video has been added yet.</div>
          )}
          {candidate.bio ? (
            <div className="candidate-profile-bio">
              <h2>About {candidate.name}</h2>
              {candidate.bio.split(/\n{2,}/).map((paragraph, index) => <p key={`${candidate.id}-bio-${index}`}>{paragraph}</p>)}
            </div>
          ) : null}
        </div>
        <aside className="candidate-profile-sidebar">
          {candidate.image ? <img className="candidate-profile-photo" src={candidate.image} alt={candidate.name} /> : null}
          <CandidateDetails candidate={candidate} showProfileLink preview={preview} />
          {candidateProjectCandidateIds.has(candidate.id) ? (
            <div className="candidate-support">
              <a className="button red" href={candidateProjectUrl} target={preview ? "_blank" : undefined} rel={preview ? "noreferrer" : undefined}>Help This Candidate Get Their Message Out</a>
              <CandidateProjectDisclaimer preview={preview} />
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

export function ShareCandidateProfileButton({ candidate, disabled = false }: { candidate: Candidate; disabled?: boolean }) {
  const [status, setStatus] = useState("");
  const path = candidateProfilePath(candidate);

  async function handleShare() {
    const url = new URL(path, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      setStatus("Copied");
      window.setTimeout(() => setStatus(""), 1800);
    } catch {
      setStatus("");
    }
  }

  return (
    <button className="button" type="button" onClick={handleShare} disabled={disabled}>
      {status || "Share Candidate Profile"}
    </button>
  );
}

type CandidateDetailRow = {
  label: string;
  value?: string;
  href?: string;
  linkText?: string;
};

export function CandidateDetails({ candidate, showProfileLink = false, preview = false }: { candidate: Candidate; showProfileLink?: boolean; preview?: boolean }) {
  const rows: CandidateDetailRow[] = [];

  rows.push(
    { label: "State", value: getStateBySlug(candidate.stateSlug)?.name },
    { label: "Office Level", value: { local: "Local", state: "State", federal: "Federal / national" }[getCandidateOfficeLevel(candidate)] },
    { label: "County Coverage", value: candidate.scope === "statewide" ? "All counties in the state" : getCountiesForState(candidate.stateSlug).filter((county) => county.slug === candidate.countySlug || candidate.countySlugs?.includes(county.slug)).map((county) => county.displayName).join(", ") || undefined },
    { label: "Running For", value: candidate.office },
    { label: "Jurisdiction", value: candidateJurisdiction(candidate) },
    { label: "Party", value: candidate.party },
    { label: "Election Year", value: candidate.electionYear ? String(candidate.electionYear) : undefined },
    { label: "Incumbent", value: candidate.incumbent ? "Yes" : undefined },
    { label: "Ballotpedia Profile", value: candidate.ballotpediaUrl, linkText: candidate.name },
    { label: "Email", value: candidate.email, href: candidate.email ? `mailto:${candidate.email}` : undefined },
    { label: "Phone", value: candidate.phone, href: candidate.phone ? `tel:${candidate.phone.replace(/\D+/g, "")}` : undefined },
    { label: "Website", value: candidate.websiteUrl, linkText: "Website" },
    { label: "Facebook", value: candidate.facebookUrl, linkText: "Facebook" },
    { label: "X / Twitter", value: candidate.xUrl, linkText: "X / Twitter" },
    { label: "Instagram", value: candidate.instagramUrl, linkText: "Instagram" },
    { label: "YouTube", value: candidate.youtubeUrl, linkText: "YouTube" },
  );

  if (showProfileLink) rows.splice(5, 0, { label: "Profile Link", value: candidateProfilePath(candidate), linkText: "Direct profile" });

  const visibleRows = rows.filter((row): row is CandidateDetailRow & { value: string } => Boolean(row.value));

  return (
    <dl className="candidate-details">
      {visibleRows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>
            {row.href || row.value?.startsWith("http") || row.value?.startsWith("/") ? (
              <a
                href={row.href || row.value}
                target={preview ? "_blank" : undefined}
                rel={preview ? "noreferrer" : undefined}
                aria-disabled={preview && row.label === "Profile Link" ? true : undefined}
                tabIndex={preview && row.label === "Profile Link" ? -1 : undefined}
                onClick={preview && row.label === "Profile Link" ? (event) => event.preventDefault() : undefined}
              >
                {row.linkText || row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
