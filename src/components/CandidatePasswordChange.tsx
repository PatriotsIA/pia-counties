import { useState, type FormEvent } from "react";
import { changeCandidateReviewerPassword, type CandidateReviewerSession } from "../lib/candidate-api";

export function CandidatePasswordChange({ session }: { session: CandidateReviewerSession }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("newPassword") || "");
    if (password !== values.get("confirmPassword")) {
      setNotice({ error: true, message: "The new passwords do not match." });
      return;
    }
    if (password.length < 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^a-zA-Z0-9\s]/.test(password) || /\s/.test(password)) {
      setNotice({ error: true, message: "Use at least 14 characters with uppercase and lowercase letters, a number, and a symbol, without spaces." });
      return;
    }
    setSaving(true);
    setNotice(undefined);
    try {
      await changeCandidateReviewerPassword(session, String(values.get("currentPassword") || ""), password);
      form.reset();
      setNotice({ error: false, message: "Your password has been changed. You are still signed in." });
    } catch (error) {
      setNotice({ error: true, message: error instanceof Error ? error.message : "Your password could not be changed." });
    } finally { setSaving(false); }
  }

  return (
    <section className="candidate-password-settings" aria-label="Account password">
      <button className="button" type="button" aria-expanded={expanded} aria-controls="candidate-password-form" onClick={() => { setExpanded(!expanded); setNotice(undefined); }} disabled={saving}>Change Password</button>
      {expanded ? <form id="candidate-password-form" className="form-card" onSubmit={submit}>
        <h2>Change your password</h2>
        <p id="candidate-password-help">Use at least 14 characters with uppercase and lowercase letters, a number, and a symbol, without spaces.</p>
        <div className="candidate-form-grid">
          <label className="field"><span>Current password</span><input type="password" name="currentPassword" autoComplete="current-password" required /></label>
          <label className="field"><span>New password</span><input type="password" name="newPassword" autoComplete="new-password" minLength={14} maxLength={256} aria-describedby="candidate-password-help" required /></label>
          <label className="field"><span>Confirm new password</span><input type="password" name="confirmPassword" autoComplete="new-password" minLength={14} maxLength={256} required /></label>
        </div>
        {notice ? <p role={notice.error ? "alert" : "status"}>{notice.message}</p> : null}
        <button className="button primary" type="submit" disabled={saving}>{saving ? "Changing password…" : "Update Password"}</button>
      </form> : null}
    </section>
  );
}
