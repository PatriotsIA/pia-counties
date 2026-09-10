import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CandidatePhotoField } from "./CandidatePhotoField";
import { CandidateCountyCoverage } from "./CandidateCountyCoverage";
import { PublishedCandidatePicker } from "./PublishedCandidatePicker";
import { LoadingIndicator } from "./LoadingIndicator";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getCountiesForState, states } from "../data/counties";
import { buildCandidateChangePatch, prepareChangeRequestAttempt } from "../lib/candidate-change-form";
import {
  candidateApiIsConfigured,
  candidateScopes,
  candidateOfficeLevels,
  submitCandidateProfile,
  submitCandidateChangeRequest,
  fetchCandidateChangeTarget,
  type CandidateChangeTarget,
  type CandidateChangeRequest,
  type CandidateSubmission,
} from "../lib/candidate-api";

type FormStatus = { tone: "success" | "error"; message: string; pendingReference?: string };

function value(values: FormData, name: string) {
  return String(values.get(name) || "").trim();
}

function optional(values: FormData, name: string) {
  return value(values, name) || undefined;
}

export function CandidateSubmissionForm() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const requestedMode = params.get("mode");
  const mode = requestedMode === "pending" || requestedMode === "published" ? requestedMode : "new";
  const reference = params.get("reference") || "";
  const candidateId = params.get("candidate") || "";
  return <CandidateIntakeForm key={location.key} mode={mode} reference={reference} candidateId={candidateId} onLoadTarget={(id) => setParams({ mode: "published", candidate: id })} onModeChange={(next) => setParams(next === "new" ? {} : { mode: next })} />;
}

function CandidateIntakeForm({ mode, reference, candidateId, onModeChange, onLoadTarget }: { mode: "new" | "pending" | "published"; reference: string; candidateId: string; onModeChange: (mode: string) => void; onLoadTarget: (id: string) => void }) {
  const [stateSlug, setStateSlug] = useState("texas");
  const [scope, setScope] = useState<CandidateSubmission["scope"]>("county");
  const attempt = useRef<{ key: string; id: string } | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<FormStatus>();
  const stateCounties = useMemo(() => getCountiesForState(stateSlug), [stateSlug]);
  const [target, setTarget] = useState<CandidateChangeTarget>();
  const [targetLoading, setTargetLoading] = useState(mode === "published" && Boolean(candidateId));

  useEffect(() => {
    if (mode !== "published" || !candidateId) return;
    let active = true;
    fetchCandidateChangeTarget(candidateId).then((loaded) => {
      if (!active) return;
      setTarget(loaded);
      setStateSlug(loaded.candidate.stateSlug);
      setScope(loaded.candidate.scope);
      setTargetLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "The profile could not be loaded." });
      setTargetLoading(false);
    });
    return () => { active = false; };
  }, [candidateId, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || uploading || (mode === "published" && !target)) return;
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    if (value(values, "honeypot")) return;

    if (mode !== "new") {
      const candidate = target ? buildCandidateChangePatch(target.candidate, values) : undefined;
      if (mode === "published" && !Object.keys(candidate || {}).length) {
        setStatus({ tone: "error", message: "Change at least one profile field before submitting a published profile update." });
        return;
      }
      setSending(true);
      setStatus(undefined);
      try {
        const payload: Omit<CandidateChangeRequest, "requestId"> = {
          targetSubmissionId: target?.submissionId || value(values, "targetSubmissionId"),
          targetStatus: mode === "published" ? "approved" : "pending",
          ...(target ? { expectedTargetRevision: target.revision, candidate } : {}),
          reason: value(values, "reason"),
          submitter: {
            submitterName: value(values, "submitterName"),
            submitterEmail: value(values, "submitterEmail"),
            submitterPhone: optional(values, "submitterPhone"),
            submitterRole: value(values, "submitterRole"),
          },
          consent: values.get("publicationConsent") === "on",
          attestation: values.get("attestation") === "on",
          honeypot: "",
        };
        attempt.current = prepareChangeRequestAttempt(payload, attempt.current);
        const receipt = await submitCandidateChangeRequest({ ...payload, requestId: attempt.current.id });
        attempt.current = undefined;
        formElement.reset();
        setStateSlug(target?.candidate.stateSlug || "texas");
        setScope(target?.candidate.scope || "county");
        setPhotoKey((key) => key + 1);
        setStatus({ tone: "success", message: `Your change request was received. Reference: ${receipt.submissionId}. Changes are reviewed before publication.` });
      } catch (error) {
        setStatus({ tone: "error", message: error instanceof Error ? error.message : "The change request could not be submitted. Please try again." });
      } finally { setSending(false); }
      return;
    }

    const countySlug = optional(values, "countySlug");
    const county = stateCounties.find((item) => item.slug === countySlug);
    const electionYear = Number.parseInt(value(values, "electionYear"), 10);
    const payload: CandidateSubmission = {
      name: value(values, "name"),
      office: value(values, "office"),
      stateSlug,
      scope,
      officeLevel: value(values, "officeLevel") as CandidateSubmission["officeLevel"],
      countySlugs: values.getAll("countySlugs").map(String),
      countySlug,
      countyName: county?.displayName,
      district: optional(values, "district"),
      profileUrl: optional(values, "profileUrl"),
      party: optional(values, "party"),
      electionYear: Number.isFinite(electionYear) ? electionYear : undefined,
      incumbent: values.get("incumbent") === "on",
      ballotpediaUrl: optional(values, "ballotpediaUrl"),
      email: optional(values, "email"),
      phone: optional(values, "phone"),
      websiteUrl: optional(values, "websiteUrl"),
      image: optional(values, "image"),
      videoEmbedUrl: optional(values, "videoEmbedUrl"),
      videoTitle: optional(values, "videoTitle"),
      bio: optional(values, "bio"),
      facebookUrl: optional(values, "facebookUrl"),
      xUrl: optional(values, "xUrl"),
      instagramUrl: optional(values, "instagramUrl"),
      youtubeUrl: optional(values, "youtubeUrl"),
      submitterName: value(values, "submitterName"),
      submitterEmail: value(values, "submitterEmail"),
      submitterPhone: optional(values, "submitterPhone"),
      submitterRole: value(values, "submitterRole"),
      attestation: values.get("attestation") === "on",
      publicationConsent: values.get("publicationConsent") === "on",
      honeypot: "",
    };

    const key = JSON.stringify(payload);
    if (attempt.current?.key !== key) {
      const slug = payload.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "") || "candidate";
      attempt.current = { key, id: `${slug}-${crypto.randomUUID().slice(0, 8)}` };
    }
    payload.id = attempt.current.id;
    setSending(true);
    setStatus(undefined);
    try {
      const receipt = await submitCandidateProfile(payload);
      formElement.reset();
      setPhotoKey((key) => key + 1);
      setStateSlug("texas");
      setScope("county");
      attempt.current = undefined;
      setStatus({
        tone: "success",
        message: `Your candidate profile was received. Reference: ${receipt.submissionId}. Submissions are reviewed before publication.`,
        pendingReference: receipt.submissionId,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "The profile could not be submitted. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="candidate-intake">
      <header className="page-hero">
        <p className="eyebrow">Candidate Directory</p>
        <h1>{mode === "new" ? "Submit a Candidate Profile" : "Request Candidate Profile Changes"}</h1>
        <p>{mode === "new" ? "Provide the information our team needs to review and publish a complete candidate directory profile." : "Send corrections to our review team. Your request does not immediately change a candidate profile."}</p>
      </header>

      <p>Fields marked <span className="required-mark">*</span> are required. For any questions or technical difficulties, please reach out to <a href="mailto:erik@patriotsinaction.com">erik@patriotsinaction.com</a>.</p>
      <label className="field"><span>Submission type</span><select aria-label="Submission type" value={mode} disabled={sending || uploading} onChange={(event) => onModeChange(event.target.value)}>
        <option value="new">New candidate profile</option>
        <option value="published">Update a published profile</option>
        <option value="pending">Update a pending profile</option>
      </select></label>
      {mode === "published" ? <PublishedCandidatePicker candidateId={candidateId} disabled={sending || uploading} onLoad={onLoadTarget} /> : null}
      {targetLoading ? <LoadingIndicator label="Loading published profile" /> : null}
      {target ? <p>Editing published profile: <strong>{target.candidate.name}</strong>. Describe and submit your corrections below.</p> : null}
      <form key={target ? `${target.submissionId}:${target.revision}` : "unloaded"} className="form-card candidate-profile-form" onSubmit={handleSubmit}>
        <label className="honeypot">Leave this field empty <input name="honeypot" tabIndex={-1} autoComplete="off" /></label>
        <fieldset disabled={sending || (mode === "published" && !target)}>
        {mode === "pending" ? <>
          <p>Pending profiles are private and are not loaded here. The review team applies your instructions to the existing draft. Use the submission reference from your receipt or one provided by staff. If you do not have it, contact our support address above.</p>
          <FormField name="targetSubmissionId" label="Pending submission reference" defaultValue={reference} required />
        </> : mode === "new" || target ? <>

        <fieldset>
          <legend>Candidate and race</legend>
          <div className="candidate-form-grid">
            <FormField name="name" defaultValue={target?.candidate.name} label="Candidate display name" autoComplete="name" required />
            <FormField name="office" defaultValue={target?.candidate.office} label="Office sought" required />
            <label className="field">
              <span id="candidate-state-label">State <span className="required-mark" aria-hidden="true">*</span></span>
              <select aria-label="State" name="stateSlug" value={stateSlug} onChange={(event) => setStateSlug(event.target.value)} required>
                {states.map((state) => <option key={state.slug} value={state.slug}>{state.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span id="candidate-scope-label">Race scope <span className="required-mark" aria-hidden="true">*</span></span>
              <select aria-label="Race scope" name="scope" value={scope} onChange={(event) => setScope(event.target.value as CandidateSubmission["scope"])} required>
                {candidateScopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>County, if applicable {(scope === "county" || scope === "precinct") ? <span className="required-mark" aria-hidden="true">*</span> : null}</span>
              <select aria-label="County, if applicable" key={stateSlug} name="countySlug" defaultValue={target?.candidate.stateSlug === stateSlug ? target.candidate.countySlug || "" : ""} required={scope === "county" || scope === "precinct"}>
                <option value="">Not county-specific</option>
                {stateCounties.map((county) => <option key={county.fips} value={county.slug}>{county.displayName}</option>)}
              </select>
            </label>
            <label className="field"><span>Office level <span className="required-mark" aria-hidden="true">*</span></span>
              <select aria-label="Office level" name="officeLevel" defaultValue={mode === "new" ? "local" : target?.candidate.officeLevel || ""} required={mode === "new"}>
                {mode === "published" ? <option value="">Not specified</option> : null}
                {candidateOfficeLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
            </label>
            <FormField name="district" defaultValue={target?.candidate.district} label="District, precinct, or city" />
            <FormField name="party" defaultValue={target?.candidate.party} label="Political party" />
            <FormField name="electionYear" defaultValue={target?.candidate.electionYear} label="Election year" type="number" min="2024" max="2100" />
          </div>
          <CandidateCountyCoverage key={stateSlug} stateSlug={stateSlug} selected={target?.candidate.stateSlug === stateSlug ? target.candidate.countySlugs : []} />
          <label className="checkbox-row">
            <input type="checkbox" name="incumbent" defaultChecked={target?.candidate.incumbent ?? false} />
            <span>This candidate is the incumbent.</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Campaign contact and links</legend>
          <div className="candidate-form-grid">
            <FormField name="email" defaultValue={target?.candidate.email} label="Public campaign email" type="email" autoComplete="email" />
            <FormField name="phone" defaultValue={target?.candidate.phone} label="Public campaign phone" type="tel" autoComplete="tel" />
            <FormField name="websiteUrl" defaultValue={target?.candidate.websiteUrl} label="Campaign website URL" type="url" />
            <FormField name="profileUrl" defaultValue={target?.candidate.profileUrl} label="Existing candidate profile URL" type="url" />
            <FormField name="ballotpediaUrl" defaultValue={target?.candidate.ballotpediaUrl} label="Ballotpedia profile URL" type="url" />
            <FormField name="facebookUrl" defaultValue={target?.candidate.facebookUrl} label="Facebook URL" type="url" />
            <FormField name="xUrl" defaultValue={target?.candidate.xUrl} label="X / Twitter URL" type="url" />
            <FormField name="instagramUrl" defaultValue={target?.candidate.instagramUrl} label="Instagram URL" type="url" />
            <FormField name="youtubeUrl" defaultValue={target?.candidate.youtubeUrl} label="YouTube URL" type="url" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Profile media and biography</legend>
          <div className="candidate-form-grid">
            <CandidatePhotoField key={photoKey} initialValue={target?.candidate.image} onBusy={setUploading} />
            <FormField name="videoEmbedUrl" defaultValue={target?.candidate.videoEmbedUrl} label="Interview/video embed URL" type="url" help="Vimeo or YouTube embed URLs work best." />
            <FormField name="videoTitle" defaultValue={target?.candidate.videoTitle} label="Video title" />
          </div>
          <FormField
            name="bio"
            defaultValue={target?.candidate.bio}
            label="Candidate biography or campaign statement"
            textarea
            maxLength={5000}
            help="Include background, priorities, qualifications, and why you are running."
          />
        </fieldset>
        </> : null}
        {mode !== "new" ? <FormField name="reason" label="Requested changes" textarea maxLength={2000} required /> : null}

        <fieldset>
          <legend>Submitter information</legend>
          <div className="candidate-form-grid">
            <FormField name="submitterName" label="Your name" autoComplete="name" required />
            <FormField name="submitterEmail" label="Your email" type="email" autoComplete="email" required />
            <FormField name="submitterPhone" label="Your phone" type="tel" autoComplete="tel" />
            <label className="field">
              <span>Your relationship to the campaign <span className="required-mark" aria-hidden="true">*</span></span>
              <select name="submitterRole" defaultValue={mode === "new" ? "candidate" : ""} required>
                {mode !== "new" ? <option value="">Select your relationship</option> : null}
                <option value="candidate">Candidate</option>
                <option value="campaign">Campaign manager or staff</option>
                <option value="volunteer">Campaign volunteer</option>
                <option value="party">Party representative</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </fieldset>

        <div className="candidate-form-consents">
          <label className="checkbox-row">
            <input type="checkbox" name="attestation" required />
            <span>I attest that this information is accurate and that I am authorized to submit it. <span className="required-mark" aria-hidden="true">*</span></span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="publicationConsent" required />
            <span>I consent to publication of the candidate profile and public campaign contact information after review. <span className="required-mark" aria-hidden="true">*</span></span>
          </label>
        </div>

        </fieldset>
        {status ? <p role={status.tone === "error" ? "alert" : "status"} className={`status form-status-${status.tone}`}>{status.message}</p> : null}
        {status?.pendingReference ? <p><Link to={`/candidate-form?mode=pending&reference=${encodeURIComponent(status.pendingReference)}`}>Request changes to this pending submission</Link>. Save this reference for followup.</p> : null}
        {!candidateApiIsConfigured() ? <p className="status form-status-error">Candidate submissions are not configured yet.</p> : null}
        <button className="button primary" type="submit" disabled={sending || uploading || (mode === "published" && !target) || !candidateApiIsConfigured()}>
          {sending ? "Submitting…" : mode === "new" ? "Submit Candidate Profile" : "Submit Change Request"}
        </button>
        <p className="privacy-reassurance">Submissions are reviewed before publication. <Link to="/privacy">Read our Privacy Policy</Link>.</p>
      </form>
    </section>
  );
}

function FormField({
  label,
  help,
  textarea = false,
  ...inputProps
}: {
  label: string;
  help?: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label} {inputProps.required ? <span className="required-mark" aria-hidden="true">*</span> : null}</span>
      {textarea ? <textarea {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} aria-label={label} /> : <input {...inputProps} aria-label={label} />}
      {help ? <small>{help}</small> : null}
    </label>
  );
}
