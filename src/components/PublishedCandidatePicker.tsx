import { useEffect, useMemo, useState } from "react";
import type { Candidate } from "../data/candidates";
import { getStateBySlug } from "../data/counties";
import { fetchApprovedCandidates } from "../lib/candidate-api";
import { LoadingIndicator } from "./LoadingIndicator";

export function PublishedCandidatePicker({ candidateId, disabled, onLoad }: { candidateId: string; disabled: boolean; onLoad: (id: string) => void }) {
  const [catalog, setCatalog] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState(candidateId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    // Do not use the directory's static outage fallback as an editing target.
    fetchApprovedCandidates().then((candidates) => {
      if (active) { setCatalog(candidates); setLoading(false); }
    }).catch(() => {
      if (active) { setError("The published catalog could not be loaded. You can still enter a published profile ID below."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  const matches = useMemo(() => catalog.filter((candidate) => `${candidate.name} ${candidate.office} ${getStateBySlug(candidate.stateSlug)?.name || candidate.stateSlug} ${candidate.district || ""} ${candidate.countyName || ""}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [catalog, query]);
  return <form className="form-card" onSubmit={(event) => { event.preventDefault(); if (!disabled && profileId.trim()) onLoad(profileId.trim()); }}>
    <fieldset disabled={disabled}>
      <legend>Choose a published profile</legend>
      <p>Select a profile below or load its ID. Only published profiles can be loaded; pending drafts remain private.</p>
      <label className="field"><span>Search published profiles</span><input aria-label="Search published profiles" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, office, or state" /></label>
      <label className="field"><span>Published profile</span><select aria-label="Published profile" value="" disabled={loading} onChange={(event) => { if (event.target.value) onLoad(event.target.value); }}>
        <option value="">Select a profile to load</option>
        {matches.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} — {candidate.office} — {getStateBySlug(candidate.stateSlug)?.name || candidate.stateSlug}</option>)}
      </select></label>
      {loading ? <LoadingIndicator label="Loading published catalog" /> : null}
      {!loading && !error && !matches.length ? <p>No published profiles match this search.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <label className="field"><span>Published profile ID</span><input aria-label="Published profile ID" value={profileId} onChange={(event) => setProfileId(event.target.value)} /></label>
      <button className="button" type="submit" disabled={disabled || !profileId.trim()}>Load Profile</button>
    </fieldset>
  </form>;
}
