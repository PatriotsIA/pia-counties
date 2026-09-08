import { useState } from "react";
import { uploadCandidatePhoto } from "../lib/candidate-api";

export function CandidatePhotoField({ initialValue = "", label = "Portrait image URL", onBusy }: { initialValue?: string; label?: string; onBusy: (busy: boolean) => void }) {
  const [url, setUrl] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="candidate-photo-field">
    <label className="field"><span>Upload profile picture</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        setBusy(true); onBusy(true); setError("");
        try { setUrl(await uploadCandidatePhoto(file)); }
        catch (error) { setError(error instanceof Error ? error.message : "Photo upload failed. Please try again."); }
        finally { setBusy(false); onBusy(false); input.value = ""; }
      }} />
      <small>JPG, PNG, or WebP, up to 5 MB. Photos are resized for quick loading.</small>
    </label>
    <label className="field"><span>{label}</span><input aria-label={label} name="image" value={url} onChange={(event) => setUrl(event.target.value)} disabled={busy} /><small>Upload a photo above or enter a direct image URL.</small></label>
    {busy ? <p role="status">Uploading photo…</p> : null}
    {error ? <p role="alert" className="form-status-error">{error}</p> : null}
    {url ? <img className="candidate-photo-thumbnail" src={url} alt="Selected profile picture" /> : null}
  </div>;
}
