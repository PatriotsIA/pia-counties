import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getCountiesForState, states } from "../data/counties";
import {
  candidateApiIsConfigured,
  candidateScopes,
  submitCandidateProfile,
  type CandidateSubmission,
} from "../lib/candidate-api";

type FormStatus = { tone: "success" | "error"; message: string };

function value(values: FormData, name: string) {
  return String(values.get(name) || "").trim();
}

function optional(values: FormData, name: string) {
  return value(values, name) || undefined;
}

export function CandidateSubmissionForm() {
  const [stateSlug, setStateSlug] = useState("texas");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<FormStatus>();
  const stateCounties = useMemo(() => getCountiesForState(stateSlug), [stateSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    if (value(values, "honeypot")) return;

    const countySlug = optional(values, "countySlug");
    const county = stateCounties.find((item) => item.slug === countySlug);
    const electionYear = Number.parseInt(value(values, "electionYear"), 10);
    const payload: CandidateSubmission = {
      name: value(values, "name"),
      office: value(values, "office"),
      stateSlug,
      scope: value(values, "scope") as CandidateSubmission["scope"],
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

    setSending(true);
    setStatus(undefined);
    try {
      await submitCandidateProfile(payload);
      formElement.reset();
      setStateSlug("texas");
      setStatus({
        tone: "success",
        message: "Your candidate profile was submitted for review. Our team will contact you if more information is needed.",
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
        <h1>Submit a Candidate Profile</h1>
        <p>Provide the information our team needs to review and publish a complete candidate directory profile.</p>
      </header>

      <form className="form-card candidate-profile-form" onSubmit={handleSubmit}>
        <label className="honeypot">Leave this field empty <input name="honeypot" tabIndex={-1} autoComplete="off" /></label>

        <fieldset>
          <legend>Candidate and race</legend>
          <div className="candidate-form-grid">
            <FormField name="name" label="Candidate display name" autoComplete="name" required />
            <FormField name="office" label="Office sought" required />
            <label className="field">
              <span>State</span>
              <select name="stateSlug" value={stateSlug} onChange={(event) => setStateSlug(event.target.value)} required>
                {states.map((state) => <option key={state.slug} value={state.slug}>{state.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Race scope</span>
              <select name="scope" defaultValue="county" required>
                {candidateScopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>County, if applicable</span>
              <select name="countySlug" defaultValue="">
                <option value="">Not county-specific</option>
                {stateCounties.map((county) => <option key={county.fips} value={county.slug}>{county.displayName}</option>)}
              </select>
            </label>
            <FormField name="district" label="District, precinct, or city" />
            <FormField name="party" label="Political party" />
            <FormField name="electionYear" label="Election year" type="number" min="2024" max="2100" />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="incumbent" />
            <span>This candidate is the incumbent.</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Campaign contact and links</legend>
          <div className="candidate-form-grid">
            <FormField name="email" label="Public campaign email" type="email" autoComplete="email" />
            <FormField name="phone" label="Public campaign phone" type="tel" autoComplete="tel" />
            <FormField name="websiteUrl" label="Campaign website URL" type="url" />
            <FormField name="profileUrl" label="Existing candidate profile URL" type="url" />
            <FormField name="ballotpediaUrl" label="Ballotpedia profile URL" type="url" />
            <FormField name="facebookUrl" label="Facebook URL" type="url" />
            <FormField name="xUrl" label="X / Twitter URL" type="url" />
            <FormField name="instagramUrl" label="Instagram URL" type="url" />
            <FormField name="youtubeUrl" label="YouTube URL" type="url" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Profile media and biography</legend>
          <div className="candidate-form-grid">
            <FormField name="image" label="Portrait image URL" type="url" help="Use a direct, publicly accessible image URL." />
            <FormField name="videoEmbedUrl" label="Interview/video embed URL" type="url" help="Vimeo or YouTube embed URLs work best." />
            <FormField name="videoTitle" label="Video title" />
          </div>
          <FormField
            name="bio"
            label="Candidate biography or campaign statement"
            textarea
            maxLength={5000}
            help="Include background, priorities, qualifications, and why you are running."
          />
        </fieldset>

        <fieldset>
          <legend>Submitter information</legend>
          <div className="candidate-form-grid">
            <FormField name="submitterName" label="Your name" autoComplete="name" required />
            <FormField name="submitterEmail" label="Your email" type="email" autoComplete="email" required />
            <FormField name="submitterPhone" label="Your phone" type="tel" autoComplete="tel" />
            <label className="field">
              <span>Your relationship to the campaign</span>
              <select name="submitterRole" defaultValue="candidate" required>
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
            <span>I attest that this information is accurate and that I am authorized to submit it.</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="publicationConsent" required />
            <span>I consent to publication of the candidate profile and public campaign contact information after review.</span>
          </label>
        </div>

        {status ? <p className={`status form-status-${status.tone}`}>{status.message}</p> : null}
        {!candidateApiIsConfigured() ? <p className="status form-status-error">Candidate submissions are not configured yet.</p> : null}
        <button className="button primary" type="submit" disabled={sending || !candidateApiIsConfigured()}>
          {sending ? "Submitting…" : "Submit Candidate Profile"}
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
      <span>{label}</span>
      {textarea ? <textarea {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} /> : <input {...inputProps} />}
      {help ? <small>{help}</small> : null}
    </label>
  );
}
