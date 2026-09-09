import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { candidateProfilePath } from "../lib/candidate-profile";
import { getCandidateOfficeLevel, type Candidate } from "../data/candidates";
import { getCountiesForState, getStateBySlug, states } from "../data/counties";
import { CandidatePhotoField } from "./CandidatePhotoField";
import { CandidateCountyCoverage } from "./CandidateCountyCoverage";
import { CandidateProfile } from "./CandidateProfile";
import { CandidatePasswordChange } from "./CandidatePasswordChange";
import {
  candidateScopes,
  candidateOfficeLevels,
  clearCandidateReviewerSession,
  completeCandidateReviewerMfa,
  fetchCandidateSubmissions,
  fetchCandidateSubmission,
  loginCandidateReviewer,
  moderateCandidateSubmission,
  readCandidateReviewerSession,
  signOutCandidateReviewer,
  updateCandidateSubmission,
  type CandidateReviewRecord,
  type CandidateReviewStatus,
  type CandidateReviewerLoginChallenge,
  type CandidateReviewerSession,
} from "../lib/candidate-api";

type Notice = { tone: "success" | "error"; message: string };

function recordKey(record: CandidateReviewRecord) {
  return record.submissionId || record.id;
}

export function CandidateReviewConsole({ onApproved }: { onApproved?: () => Promise<void> | void }) {
  const [params, setParams] = useSearchParams();
  const [session, setSession] = useState<CandidateReviewerSession | undefined>(() => readCandidateReviewerSession());
  const [records, setRecords] = useState<CandidateReviewRecord[]>([]);
  const [selectedId, setSelectedId] = useState(params.get("submission") || "");
  const [statusFilter, setStatusFilter] = useState<CandidateReviewStatus | "all">(params.has("submission") ? "all" : "pending");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [returnToRequest, setReturnToRequest] = useState("");
  const [dirty, setDirty] = useState(false);
  const [editorReset, setEditorReset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const loadVersion = useRef(0);

  useEffect(() => () => { loadVersion.current += 1; clearCandidateReviewerSession(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const loadRecords = useCallback(async () => {
    if (!session) return;
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const items = await fetchCandidateSubmissions(session, statusFilter);
      if (version !== loadVersion.current) return;
      setRecords(items);
      setSelectedId((current) => current && items.some((item) => recordKey(item) === current) ? current : items[0] ? recordKey(items[0]) : "");
    } catch (error) {
      if (version !== loadVersion.current) return;
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Submissions could not be loaded." });
      if (!readCandidateReviewerSession()) setSession(undefined);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [session, statusFilter]);

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
    return () => { loadVersion.current += 1; };
  }, [loadRecords]);

  if (!session) {
    return <CandidateReviewerLogin onLogin={setSession} />;
  }

  const query = search.trim().toLowerCase();
  const visibleRecords = records.filter((record) =>
    !(statusFilter === "approved" && record.source === "change-request") &&
    (typeFilter === "all" || (typeFilter === "requests" ? record.source === "change-request" : record.source !== "change-request")) &&
    [record.name, record.office, record.id, record.submissionId, record.stateSlug, getStateBySlug(record.stateSlug)?.name].some((text) => text?.toLowerCase().includes(query)));
  const selected = visibleRecords.find((record) => recordKey(record) === selectedId) || visibleRecords[0];

  function canLeaveEditor() {
    if (dirty && !window.confirm("Discard unsaved candidate edits?")) return false;
    if (dirty) setEditorReset((version) => version + 1);
    setDirty(false);
    return true;
  }

  async function openRecord(submissionId: string, fromRequest = "") {
    if (!canLeaveEditor()) return;
    const version = ++loadVersion.current;
    setLoading(true);
    setNotice(undefined);
    try {
      const record = await fetchCandidateSubmission(session!, submissionId);
      if (version !== loadVersion.current) return;
      setReturnToRequest(fromRequest);
      setRecords((items) => [record, ...items.filter((item) => recordKey(item) !== submissionId)]);
      setSelectedId(submissionId);
      setParams({ submission: submissionId }, { replace: true });
      setSearch("");
      setTypeFilter("all");
      setStatusFilter(record.source === "change-request" ? "all" : record.status);
    } catch (error) {
      if (version !== loadVersion.current) return;
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "The original profile could not be opened." });
      if (!readCandidateReviewerSession()) setSession(undefined);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }

  async function saveRecord(payload: Partial<CandidateReviewRecord>) {
    if (!selected) return undefined;
    const updated = await updateCandidateSubmission(session!, recordKey(selected), payload);
    setRecords((items) => items.map((item) => recordKey(item) === recordKey(selected) ? updated : item));
    setDirty(false);
    return updated;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setNotice(undefined);
    try {
      await saveRecord(reviewPayload(new FormData(event.currentTarget), selected));
      if (selected.status === "approved" && selected.source !== "change-request") await onApproved?.();
      setNotice({ tone: "success", message: selected.source === "change-request" ? "Proposed changes saved. The original profile has not changed." : selected.status === "approved" ? "Published profile updated." : "Candidate profile changes saved." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Changes could not be saved." });
      if (!readCandidateReviewerSession()) setSession(undefined);
    } finally {
      setLoading(false);
    }
  }

  async function moderate(action: "approve" | "deny") {
    if (!selected) return;
    const form = document.querySelector<HTMLFormElement>("#candidate-review-editor");
    if (action === "approve" && form && !form.reportValidity()) return;
    const reason = form ? String(new FormData(form).get("moderationReason") || "").trim() : "";
    if (action === "deny" && !reason) {
      setNotice({ tone: "error", message: "Enter a denial reason before denying this submission." });
      return;
    }

    setLoading(true);
    setNotice(undefined);
    try {
      const saved = action === "approve" && form ? await saveRecord(reviewPayload(new FormData(form), selected)) : selected;
      if (!saved) return;
      await moderateCandidateSubmission(session!, recordKey(selected), action, saved.revision, reason || undefined);
      setDirty(false);
      if (action === "approve") await onApproved?.();
      await loadRecords();
      setNotice({ tone: "success", message: selected.source === "change-request"
        ? action === "deny" ? "Change request denied. The original profile has not changed." : selected.changeRequest?.targetStatus === "pending" ? "Change request applied. The original profile is still pending publication review." : "Change request applied to the published profile."
        : action === "approve" ? "Candidate approved and added to the directory." : "Candidate submission denied." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Moderation action failed." });
      if (!readCandidateReviewerSession()) setSession(undefined);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    if (!canLeaveEditor()) return;
    loadVersion.current += 1;
    void signOutCandidateReviewer(session!);
    setSession(undefined);
    setRecords([]);
  }

  return (
    <section className="candidate-review-console">
      <header className="candidate-review-header">
        <div>
          <p className="eyebrow">Private Administration</p>
          <h1>Candidate Review</h1>
          <p>Signed in as {session.username}</p>
        </div>
        <button className="button" type="button" onClick={logout} disabled={loading}>Sign Out</button>
      </header>

      <CandidatePasswordChange session={session} />
      <div className="candidate-review-tabs" role="tablist" aria-label="Candidate workspace">
        {([['pending', 'Review queue'], ['approved', 'Published profiles'], ['all', 'All records']] as const).map(([value, label]) => (
          <button key={value} className="button" type="button" role="tab" aria-selected={statusFilter === value} disabled={loading} onClick={() => { if (!canLeaveEditor()) return; setStatusFilter(value); setTypeFilter("all"); setSearch(""); setNotice(undefined); }}>{label}</button>
        ))}
      </div>
      <div className="candidate-review-toolbar">
        <label className="field"><span>Search candidates</span><input type="search" value={search} disabled={loading} placeholder="Name, office, state, or reference" onChange={(event) => { if (canLeaveEditor()) setSearch(event.target.value); }} /></label>
        <label className="field">
          <span>Submission status</span>
          <select value={statusFilter} disabled={loading} onChange={(event) => { if (canLeaveEditor()) { setStatusFilter(event.target.value as CandidateReviewStatus | "all"); setTypeFilter("all"); } }}>
            <option value="pending">Pending</option>
            <option value="approved">Published</option>
            <option value="denied">Denied</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="field"><span>Record type</span><select value={typeFilter} disabled={loading || statusFilter === "approved"} onChange={(event) => { if (canLeaveEditor()) setTypeFilter(event.target.value); }}><option value="all">All types</option><option value="requests">Change requests</option><option value="profiles">Original profiles</option></select></label>
        <button className="button" type="button" onClick={() => { if (canLeaveEditor()) void loadRecords(); }} disabled={loading}>Refresh</button>
      </div>

      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`status form-status-${notice.tone}`}>{notice.message}</p> : null}
      <div className="candidate-review-layout">
        <aside className="candidate-review-list" aria-label="Candidate submissions">
          {visibleRecords.map((record) => (
            <button
              className={recordKey(record) === (selected && recordKey(selected)) ? "candidate-review-list-item active" : "candidate-review-list-item"}
              key={recordKey(record)}
              type="button"
              disabled={loading}
              onClick={() => { if (!canLeaveEditor()) return; setSelectedId(recordKey(record)); setParams({ submission: recordKey(record) }, { replace: true }); setNotice(undefined); }}
            >
              <strong>{record.name}</strong>
              <span>{record.office}</span>
              <span className="candidate-record-kind">{record.source === "change-request" ? `Update request · ${record.changeRequest?.targetStatus === "approved" ? "published" : "pending"} profile` : record.status === "approved" ? "Published profile" : "Original profile"}</span>
              <small>{record.status} · {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "Imported"}</small>
            </button>
          ))}
          {!loading && !visibleRecords.length ? <p>No matching candidate records found.</p> : null}
        </aside>
        <div className="candidate-review-editor">
          {returnToRequest ? <button className="button" type="button" disabled={loading} onClick={() => void openRecord(returnToRequest)}>Back to Change Request</button> : null}
          {selected ? (
            <CandidateReviewEditor
              key={`${recordKey(selected)}-${selected.revision}-${editorReset}`}
              record={selected}
              loading={loading}
              onSubmit={handleSave}
              onDirty={() => setDirty(true)}
              onApprove={() => void moderate("approve")}
              onDeny={() => void moderate("deny")}
              onOpenOriginal={() => { if (selected.changeRequest) void openRecord(selected.changeRequest.targetSubmissionId, recordKey(selected)); }}
            />
          ) : (
            <div className="panel"><p>Select a candidate submission to review.</p></div>
          )}
        </div>
      </div>
    </section>
  );
}

function CandidateReviewerLogin({ onLogin }: { onLogin: (session: CandidateReviewerSession) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<CandidateReviewerLoginChallenge>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const result = await loginCandidateReviewer(String(values.get("username") || ""), String(values.get("password") || ""));
      if ("idToken" in result) onLogin(result);
      else setChallenge(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    const values = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      onLogin(await completeCandidateReviewerMfa(challenge, String(values.get("code") || "")));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="candidate-review-login">
      {challenge ? (
        <form className="form-card" onSubmit={submitMfa}>
          <p className="eyebrow">Two-Factor Authentication</p>
          <h1>Verification Code</h1>
          <p>Enter the code from your authenticator app or SMS message.</p>
          <label className="field"><span>Verification code</span><input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus /></label>
          {error ? <p className="status form-status-error">{error}</p> : null}
          <button className="button primary" type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify & Sign In"}</button>
          <button className="button" type="button" onClick={() => { setChallenge(undefined); setError(""); }} disabled={loading}>Back</button>
        </form>
      ) : (
        <form className="form-card" onSubmit={submit}>
          <p className="eyebrow">Private Administration</p>
          <h1>Candidate Review</h1>
          <p>Sign in with an authorized reviewer account.</p>
          <label className="field"><span>Email or username</span><input name="username" autoComplete="username" required /></label>
          <label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
          {error ? <p className="status form-status-error">{error}</p> : null}
          <button className="button primary" type="submit" disabled={loading}>{loading ? "Signing In…" : "Sign In"}</button>
        </form>
      )}
    </section>
  );
}

function CandidateReviewEditor({
  record,
  loading,
  onSubmit,
  onApprove,
  onDeny,
  onOpenOriginal,
  onDirty,
}: {
  record: CandidateReviewRecord;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApprove: () => void;
  onDeny: () => void;
  onOpenOriginal: () => void;
  onDirty: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<Candidate>();
  const [draft, setDraft] = useState<Candidate>();
  const [stateSlug, setStateSlug] = useState(getStateBySlug(record.stateSlug)?.slug || record.stateSlug);
  const [uploading, setUploading] = useState(false);
  const busy = loading || uploading;
  const isRequest = record.source === "change-request";
  const closedRequest = isRequest && record.status !== "pending";

  function previewProfile() {
    if (closedRequest) {
      setPreview(Object.fromEntries((["id", ...Object.keys(profileFieldLabels)] as (keyof Candidate)[]).map((key) => [key, record[key]])) as Candidate);
    } else if (formRef.current) setPreview(reviewCandidate(new FormData(formRef.current), record));
  }

  return (
    <>
      <form ref={formRef} id="candidate-review-editor" className="form-card candidate-profile-form" onChange={(event) => { setDraft(reviewCandidate(new FormData(event.currentTarget), record)); onDirty(); }} onSubmit={(event) => { if (busy || closedRequest) event.preventDefault(); else onSubmit(event); }}>
        <div className="candidate-review-status">
          <strong>Status: {record.status}</strong>
          <span>Revision {record.revision || 1}</span>
          <button className="button" type="button" aria-haspopup="dialog" onClick={previewProfile} disabled={busy}>Preview Profile</button>
          {record.status === "approved" && !isRequest ? <Link className="button" to={candidateProfilePath(record)} target="_blank" rel="noreferrer">View Published Profile</Link> : null}
        </div>
        {record.status === "approved" && !isRequest ? <p className="status">Saving changes updates this published profile immediately.</p> : null}
        {record.changeRequest ? <CandidateChangeDetails record={record} candidate={draft || record} busy={busy} onOpenOriginal={onOpenOriginal} /> : null}
        {closedRequest ? <p className="status">This change request is closed and read-only. Open the original profile to make further changes.</p> : null}
        {record.source === "research" ? <p className="status">Research draft prepared for your review. Sources are in the private review notes; no candidate attestation or publication consent was collected.</p> : null}
        <p>Fields marked <span className="required-mark">*</span> are required.</p>
        <fieldset disabled={busy || closedRequest}>
          <legend>Public candidate profile</legend>
          <div className="candidate-form-grid">
            <ReviewField name="id" label="Profile ID / URL slug" value={record.id} readOnly />
            <ReviewField name="name" label="Candidate name" value={record.name} required />
            <ReviewField name="office" label="Office sought" value={record.office} required />
            <label className="field"><span>State <span className="required-mark" aria-hidden="true">*</span></span><select aria-label="State" name="stateSlug" value={stateSlug} onChange={(event) => {
              setStateSlug(event.target.value);
              // Read again after React resets the state-dependent county controls.
              queueMicrotask(() => { if (formRef.current) setDraft(reviewCandidate(new FormData(formRef.current), record)); });
            }} required>{states.map((state) => <option key={state.slug} value={state.slug}>{state.name}</option>)}</select></label>
            <label className="field"><span>Office level <span className="required-mark" aria-hidden="true">*</span></span><select aria-label="Office level" name="officeLevel" defaultValue={getCandidateOfficeLevel(record)} required>{candidateOfficeLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select></label>
            <label className="field">
              <span>Race scope</span>
              <select name="scope" defaultValue={record.scope}>
                {candidateScopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
              </select>
            </label>
            <label className="field"><span>County</span><select name="countySlug" key={stateSlug} defaultValue={stateSlug === getStateBySlug(record.stateSlug)?.slug ? record.countySlug || "" : ""}><option value="">Not county-specific</option>{getCountiesForState(stateSlug).map((county) => <option key={county.fips} value={county.slug}>{county.displayName}</option>)}</select></label>
            <ReviewField name="district" label="District / precinct / city" value={record.district} />
            <ReviewField name="party" label="Party" value={record.party} />
            <ReviewField name="electionYear" label="Election year" type="number" value={record.electionYear} />
            <ReviewField name="email" label="Public email" type="email" value={record.email} />
            <ReviewField name="phone" label="Public phone" value={record.phone} />
            <ReviewField name="websiteUrl" label="Website URL" type="url" value={record.websiteUrl} />
            <ReviewField name="profileUrl" label="Existing profile URL" type="url" value={record.profileUrl} />
            <ReviewField name="ballotpediaUrl" label="Ballotpedia URL" type="url" value={record.ballotpediaUrl} />
            <CandidatePhotoField initialValue={record.image} label="Portrait URL" onBusy={setUploading} onValueChange={(image) => { if (!formRef.current) return; setDraft((current) => ({ ...(current || record), image: image.trim() || undefined })); onDirty(); }} />
            <ReviewField name="videoEmbedUrl" label="Video embed URL" type="url" value={record.videoEmbedUrl} />
            <ReviewField name="videoTitle" label="Video title" value={record.videoTitle} />
            <ReviewField name="facebookUrl" label="Facebook URL" type="url" value={record.facebookUrl} />
            <ReviewField name="xUrl" label="X / Twitter URL" type="url" value={record.xUrl} />
            <ReviewField name="instagramUrl" label="Instagram URL" type="url" value={record.instagramUrl} />
            <ReviewField name="youtubeUrl" label="YouTube URL" type="url" value={record.youtubeUrl} />
          </div>
          <CandidateCountyCoverage key={stateSlug} stateSlug={stateSlug} selected={stateSlug === getStateBySlug(record.stateSlug)?.slug ? record.countySlugs : []} />
          <label className="checkbox-row">
            <input type="checkbox" name="incumbent" defaultChecked={record.incumbent} />
            <span>Incumbent</span>
          </label>
          <ReviewField name="bio" label="Biography" textarea value={record.bio} />
        </fieldset>

        <fieldset>
          <legend>Private submission details</legend>
          <div className="candidate-form-grid">
            <ReviewField name="submitterName" label="Submitter" value={record.submitterName} readOnly />
            <ReviewField name="submitterEmail" label="Submitter email" value={record.submitterEmail} readOnly />
            <ReviewField name="submitterPhone" label="Submitter phone" value={record.submitterPhone} readOnly />
            <ReviewField name="submitterRole" label="Submitter role" value={record.submitterRole} readOnly />
          </div>
        </fieldset>

        <ReviewField name="moderationReason" label="Review notes / denial reason" textarea value={record.moderationReason} readOnly={busy || closedRequest} />
        <div className="candidate-review-actions">
          <button className="button" type="button" aria-haspopup="dialog" onClick={previewProfile} disabled={busy}>Preview Profile</button>
          {!closedRequest ? <button className="button" type="submit" disabled={busy}>{isRequest ? "Save Proposed Changes" : record.status === "approved" ? "Save Published Profile" : "Save Changes"}</button> : null}
          {record.status === "pending" ? (
            <>
              <button className="button primary" type="button" onClick={onApprove} disabled={busy || (Boolean(record.changeRequest) && !changedProfileFields(record.changeRequest!.baseCandidate, draft || record).length)}>{isRequest ? record.changeRequest?.targetStatus === "pending" ? "Apply to Pending Profile" : "Apply to Published Profile" : "Approve & Publish"}</button>
              <button className="button red" type="button" onClick={onDeny} disabled={busy}>{isRequest ? "Deny Request" : "Deny"}</button>
            </>
          ) : null}
        </div>
      </form>
      {preview ? <CandidateProfilePreview candidate={preview} onClose={() => setPreview(undefined)} /> : null}
    </>
  );
}

const profileFieldLabels: Partial<Record<keyof Candidate, string>> = {
    name: "Name", office: "Office", stateSlug: "State", scope: "Scope", officeLevel: "Office level",
    countySlug: "Primary county", countySlugs: "County coverage", countyName: "County name", district: "District",
    party: "Party", electionYear: "Election year", incumbent: "Incumbent", bio: "Biography",
    email: "Public email", phone: "Public phone", websiteUrl: "Website", profileUrl: "Profile URL", ballotpediaUrl: "Ballotpedia",
    image: "Portrait", videoEmbedUrl: "Video", videoTitle: "Video title", facebookUrl: "Facebook", xUrl: "X / Twitter", instagramUrl: "Instagram", youtubeUrl: "YouTube",
  };

function countyCoverageKey(countySlugs: Candidate["countySlugs"]) {
  return JSON.stringify([...new Set(countySlugs || [])].sort());
}

function changedProfileFields(original: Candidate, proposed: Candidate) {
  return (Object.keys(profileFieldLabels) as (keyof Candidate)[]).filter((key) => key === "countySlugs"
    ? countyCoverageKey(original.countySlugs) !== countyCoverageKey(proposed.countySlugs)
    : JSON.stringify(original[key] ?? null) !== JSON.stringify(proposed[key] ?? null));
}

function CandidateChangeDetails({ record, candidate, busy, onOpenOriginal }: { record: CandidateReviewRecord; candidate: Candidate; busy: boolean; onOpenOriginal: () => void }) {
  const request = record.changeRequest!;
  const changed = changedProfileFields(request.baseCandidate, candidate);
  const display = (value: Candidate[keyof Candidate]) => value === undefined || value === "" || (Array.isArray(value) && !value.length) ? "Not set" : Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);
  return (
    <section className="candidate-change-details" aria-label="Change request details">
      <h2>Requested update to {request.targetStatus === "approved" ? "published" : "pending"} profile</h2>
      <p className="candidate-change-reason">{request.reason}</p>
      <p>Original reference: <strong>{request.targetSubmissionId}</strong> · Revision {request.targetRevision} at request time</p>
      <p>Request reference: {record.submissionId}. Verify the requester’s authority and the requested information before applying changes.</p>
      <button className="button" type="button" disabled={busy} onClick={onOpenOriginal}>Open Original Profile</button>
      <p>{request.targetStatus === "pending" ? "Applying this request updates the pending draft only. Publication still requires separate approval." : "Saving proposed edits does not change the live profile. Applying the request updates the existing published profile."}</p>
      {changed.length ? <div className="candidate-change-table-scroll"><table aria-label="Proposed profile changes">
        <thead><tr><th scope="col">Field</th><th scope="col">Original at request time</th><th scope="col">Proposed value</th></tr></thead>
        <tbody>{changed.map((key) => <tr key={key}><th scope="row">{profileFieldLabels[key]}</th><td>{display(request.baseCandidate[key])}</td><td>{display(candidate[key])}</td></tr>)}</tbody>
      </table></div> : <p>Enter the requested edits below before applying this request.</p>}
    </section>
  );
}

function CandidateProfilePreview({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      // Removing the dialog closes it. Calling close during StrictMode's
      // effect replay would fire onClose and dismiss a newly opened preview.
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="candidate-preview-dialog" aria-labelledby="candidate-preview-title" aria-describedby="candidate-preview-description" onClose={onClose}>
      <header className="candidate-preview-header">
        <div>
          <h2 id="candidate-preview-title">Profile preview</h2>
          <p id="candidate-preview-description">The published profile layout with your current edits.</p>
        </div>
        <button className="button" type="button" autoFocus onClick={() => dialogRef.current?.close()}>Close Preview</button>
      </header>
      <CandidateProfile candidate={candidate} backPath="/counties" preview />
    </dialog>
  );
}

function ReviewField({
  label,
  textarea = false,
  value,
  ...props
}: {
  label: string;
  textarea?: boolean;
  value?: string | number | null;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label} {props.required ? <span className="required-mark" aria-hidden="true">*</span> : null}</span>
      {textarea
        ? <textarea name={props.name} aria-label={label} readOnly={props.readOnly} defaultValue={String(value || "")} rows={5} />
        : <input {...props} aria-label={label} defaultValue={value ?? ""} />}
    </label>
  );
}

function reviewPayload(values: FormData, record: CandidateReviewRecord): Partial<CandidateReviewRecord> {
  return {
    ...reviewCandidate(values, record),
    moderationReason: String(values.get("moderationReason") || "").trim() || undefined,
    revision: record.revision,
  };
}

function reviewCandidate(values: FormData, record: CandidateReviewRecord): Candidate {
  const read = (name: string) => String(values.get(name) || "").trim();
  const optional = (name: string) => read(name) || undefined;
  const electionYear = Number.parseInt(read("electionYear"), 10);
  const countySlugs = values.getAll("countySlugs").map(String);
  return {
    id: record.id,
    name: read("name"),
    office: read("office"),
    stateSlug: read("stateSlug"),
    scope: read("scope") as CandidateReviewRecord["scope"],
    countySlug: optional("countySlug"),
    countyName: record.countyName === undefined && optional("countySlug") === record.countySlug && read("stateSlug") === getStateBySlug(record.stateSlug)?.slug ? undefined : getCountiesForState(read("stateSlug")).find((county) => county.slug === read("countySlug"))?.displayName,
    officeLevel: record.officeLevel === undefined && read("officeLevel") === getCandidateOfficeLevel(record) ? undefined : read("officeLevel") as Candidate["officeLevel"],
    // Unchanged coverage keeps its saved representation, not checkbox DOM order.
    countySlugs: countyCoverageKey(countySlugs) === countyCoverageKey(record.countySlugs) ? record.countySlugs : countySlugs,
    district: optional("district"),
    party: optional("party"),
    electionYear: Number.isFinite(electionYear) ? electionYear : undefined,
    incumbent: record.incumbent === undefined && values.get("incumbent") !== "on" ? undefined : values.get("incumbent") === "on",
    email: optional("email"),
    phone: optional("phone"),
    websiteUrl: optional("websiteUrl"),
    profileUrl: optional("profileUrl"),
    ballotpediaUrl: optional("ballotpediaUrl"),
    image: optional("image"),
    videoEmbedUrl: optional("videoEmbedUrl"),
    videoTitle: optional("videoTitle"),
    bio: optional("bio"),
    facebookUrl: optional("facebookUrl"),
    xUrl: optional("xUrl"),
    instagramUrl: optional("instagramUrl"),
    youtubeUrl: optional("youtubeUrl"),
  };
}
