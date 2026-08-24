import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  candidateScopes,
  completeCandidateReviewerMfa,
  fetchCandidateSubmissions,
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
  const [session, setSession] = useState<CandidateReviewerSession | undefined>(() => readCandidateReviewerSession());
  const [records, setRecords] = useState<CandidateReviewRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateReviewStatus | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>();

  const loadRecords = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const items = await fetchCandidateSubmissions(session, statusFilter);
      setRecords(items);
      setSelectedId((current) => current && items.some((item) => recordKey(item) === current) ? current : items[0] ? recordKey(items[0]) : "");
      setNotice(undefined);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Submissions could not be loaded." });
      if (!readCandidateReviewerSession()) setSession(undefined);
    } finally {
      setLoading(false);
    }
  }, [session, statusFilter]);

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
  }, [loadRecords]);

  if (!session) {
    return <CandidateReviewerLogin onLogin={setSession} />;
  }

  const selected = records.find((record) => recordKey(record) === selectedId);

  async function saveRecord(payload: Partial<CandidateReviewRecord>) {
    if (!selected) return undefined;
    const updated = await updateCandidateSubmission(session!, recordKey(selected), payload);
    setRecords((items) => items.map((item) => recordKey(item) === recordKey(selected) ? { ...item, ...updated } : item));
    return updated;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setNotice(undefined);
    try {
      await saveRecord(reviewPayload(new FormData(event.currentTarget), selected));
      setNotice({ tone: "success", message: "Candidate profile changes saved." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Changes could not be saved." });
    } finally {
      setLoading(false);
    }
  }

  async function moderate(action: "approve" | "deny") {
    if (!selected) return;
    const form = document.querySelector<HTMLFormElement>("#candidate-review-editor");
    const reason = form ? String(new FormData(form).get("moderationReason") || "").trim() : "";
    if (action === "deny" && !reason) {
      setNotice({ tone: "error", message: "Enter a denial reason before denying this submission." });
      return;
    }

    setLoading(true);
    setNotice(undefined);
    try {
      const saved = form ? await saveRecord(reviewPayload(new FormData(form), selected)) : selected;
      if (!saved) return;
      await moderateCandidateSubmission(session!, recordKey(selected), action, saved.revision, reason || undefined);
      if (action === "approve") await onApproved?.();
      setNotice({ tone: "success", message: action === "approve" ? "Candidate approved and added to the directory." : "Candidate submission denied." });
      await loadRecords();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Moderation action failed." });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
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
        <button className="button" type="button" onClick={logout}>Sign Out</button>
      </header>

      <div className="candidate-review-toolbar">
        <label className="field">
          <span>Submission status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CandidateReviewStatus | "all")}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="all">All</option>
          </select>
        </label>
        <button className="button" type="button" onClick={() => void loadRecords()} disabled={loading}>Refresh</button>
      </div>

      {notice ? <p className={`status form-status-${notice.tone}`}>{notice.message}</p> : null}
      <div className="candidate-review-layout">
        <aside className="candidate-review-list" aria-label="Candidate submissions">
          {records.map((record) => (
            <button
              className={recordKey(record) === selectedId ? "candidate-review-list-item active" : "candidate-review-list-item"}
              key={recordKey(record)}
              type="button"
              onClick={() => setSelectedId(recordKey(record))}
            >
              <strong>{record.name}</strong>
              <span>{record.office}</span>
              <small>{record.status} · {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "Imported"}</small>
            </button>
          ))}
          {!loading && !records.length ? <p>No {statusFilter === "all" ? "" : statusFilter} submissions found.</p> : null}
        </aside>
        <div className="candidate-review-editor">
          {selected ? (
            <CandidateReviewEditor
              key={`${recordKey(selected)}-${selected.updatedAt}`}
              record={selected}
              loading={loading}
              onSubmit={handleSave}
              onApprove={() => void moderate("approve")}
              onDeny={() => void moderate("deny")}
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
}: {
  record: CandidateReviewRecord;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <form id="candidate-review-editor" className="form-card candidate-profile-form" onSubmit={onSubmit}>
      <div className="candidate-review-status">
        <strong>Status: {record.status}</strong>
        <span>Revision {record.revision || 1}</span>
      </div>
      <fieldset>
        <legend>Public candidate profile</legend>
        <div className="candidate-form-grid">
          <ReviewField name="id" label="Profile ID / URL slug" value={record.id} readOnly />
          <ReviewField name="name" label="Candidate name" value={record.name} required />
          <ReviewField name="office" label="Office sought" value={record.office} required />
          <ReviewField name="stateSlug" label="State slug" value={record.stateSlug} required />
          <label className="field">
            <span>Race scope</span>
            <select name="scope" defaultValue={record.scope}>
              {candidateScopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
            </select>
          </label>
          <ReviewField name="countySlug" label="County slug" value={record.countySlug} />
          <ReviewField name="countyName" label="County name" value={record.countyName} />
          <ReviewField name="district" label="District / precinct / city" value={record.district} />
          <ReviewField name="party" label="Party" value={record.party} />
          <ReviewField name="electionYear" label="Election year" type="number" value={record.electionYear} />
          <ReviewField name="email" label="Public email" type="email" value={record.email} />
          <ReviewField name="phone" label="Public phone" value={record.phone} />
          <ReviewField name="websiteUrl" label="Website URL" type="url" value={record.websiteUrl} />
          <ReviewField name="profileUrl" label="Existing profile URL" type="url" value={record.profileUrl} />
          <ReviewField name="ballotpediaUrl" label="Ballotpedia URL" type="url" value={record.ballotpediaUrl} />
          <ReviewField name="image" label="Portrait URL" type="url" value={record.image} />
          <ReviewField name="videoEmbedUrl" label="Video embed URL" type="url" value={record.videoEmbedUrl} />
          <ReviewField name="videoTitle" label="Video title" value={record.videoTitle} />
          <ReviewField name="facebookUrl" label="Facebook URL" type="url" value={record.facebookUrl} />
          <ReviewField name="xUrl" label="X / Twitter URL" type="url" value={record.xUrl} />
          <ReviewField name="instagramUrl" label="Instagram URL" type="url" value={record.instagramUrl} />
          <ReviewField name="youtubeUrl" label="YouTube URL" type="url" value={record.youtubeUrl} />
        </div>
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

      <ReviewField name="moderationReason" label="Review notes / denial reason" textarea value={record.moderationReason} />
      <div className="candidate-review-actions">
        <button className="button" type="submit" disabled={loading}>Save Changes</button>
        {record.status === "pending" ? (
          <>
            <button className="button primary" type="button" onClick={onApprove} disabled={loading}>Approve &amp; Publish</button>
            <button className="button red" type="button" onClick={onDeny} disabled={loading}>Deny</button>
          </>
        ) : null}
      </div>
    </form>
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
      <span>{label}</span>
      {textarea
        ? <textarea name={props.name} defaultValue={String(value || "")} rows={5} />
        : <input {...props} defaultValue={value ?? ""} />}
    </label>
  );
}

function reviewPayload(values: FormData, record: CandidateReviewRecord): Partial<CandidateReviewRecord> {
  const read = (name: string) => String(values.get(name) || "").trim();
  const optional = (name: string) => read(name) || undefined;
  const electionYear = Number.parseInt(read("electionYear"), 10);
  return {
    name: read("name"),
    office: read("office"),
    stateSlug: read("stateSlug"),
    scope: read("scope") as CandidateReviewRecord["scope"],
    countySlug: optional("countySlug"),
    countyName: optional("countyName"),
    district: optional("district"),
    party: optional("party"),
    electionYear: Number.isFinite(electionYear) ? electionYear : undefined,
    incumbent: values.get("incumbent") === "on",
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
    moderationReason: optional("moderationReason"),
    revision: record.revision,
  };
}
