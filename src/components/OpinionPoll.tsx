import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import config from "../data/issues-poll-api.json";

export type Poll = { id: string; version: string; question: string; options: { id: string; label: string; count?: number }[]; total?: number };
type Receipt = { voterId: string; recordedOption?: string };
const storageKey = (poll: Poll) => `pia-opinion:${poll.id}:${poll.version}`;

function savedReceipt(poll: Poll): Receipt | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(poll)) || "null");
    if (value && typeof value.voterId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.voterId)) {
      return { voterId: value.voterId, recordedOption: poll.options.some(o => o.id === value.recordedOption) ? value.recordedOption : undefined };
    }
  } catch { /* Storage availability is checked again before a submission. */ }
  return null;
}

export function OpinionPoll({ poll, result, loading, loadError, refresh, onResult }: {
  poll: Poll; result?: Poll; loading: boolean; loadError: string; refresh: () => void; onResult: (result: Poll) => void;
}) {
  const [receipt, setReceipt] = useState(() => savedReceipt(poll));
  const [selection, setSelection] = useState(receipt?.recordedOption || "");
  const [showResults, setShowResults] = useState(Boolean(receipt?.recordedOption));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const recorded = receipt?.recordedOption;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || submitting || recorded) return;
    setError(""); setMessage(""); setSubmitting(true);
    let pending = receipt;
    try {
      // Another tab may have created a receipt since this page mounted.
      pending = savedReceipt(poll) || pending || { voterId: crypto.randomUUID() };
      localStorage.setItem(storageKey(poll), JSON.stringify(pending));
      setReceipt(pending);
    } catch {
      setError("Browser storage is unavailable. Enable it to submit a response; you can still view results.");
      setSubmitting(false); return;
    }
    try {
      const response = await fetch(`${config.url}/polls/${poll.id}/votes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ voterId: pending.voterId, option: selection, version: poll.version }),
      });
      const body = await response.json();
      if (!response.ok && !(response.status === 409 && body.alreadyRecorded)) throw new Error(body.error || "Your response could not be saved. Please try again.");
      if (!body.poll || !poll.options.some(o => o.id === body.recordedOption)) throw new Error("The server did not confirm your response. Please try again.");
      const confirmed = { voterId: pending.voterId, recordedOption: body.recordedOption as string };
      setReceipt(confirmed); setSelection(confirmed.recordedOption); setShowResults(true); onResult(body.poll);
      setMessage(body.alreadyRecorded ? "A response from this browser was already recorded. It has not been counted again." : "Your response has been recorded. Thank you.");
      try { localStorage.setItem(storageKey(poll), JSON.stringify(confirmed)); } catch { /* The server still prevents a retry of this browser ID. */ }
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError" ? cause.message : "We couldn’t confirm your response. Please try again; the same response will not be counted twice.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="opinion-poll" aria-labelledby={`poll-${poll.id}`} aria-busy={submitting}>
      <p className="issues-eyebrow">Opinion poll</p>
      <form onSubmit={submit}>
        <fieldset disabled={submitting || Boolean(recorded)}>
          <legend id={`poll-${poll.id}`}>{poll.question}</legend>
          <div className="poll-choices">
            {poll.options.map(option => <label key={option.id} className={selection === option.id ? "poll-choice is-selected" : "poll-choice"}>
              <input type="radio" name={poll.id} value={option.id} checked={selection === option.id} onChange={() => setSelection(option.id)} required />
              <span>{option.label}</span>{recorded === option.id && <small>Your response</small>}
            </label>)}
          </div>
        </fieldset>
        {!recorded && <button className="issues-button" disabled={!selection || submitting || !result || Boolean(loadError)} type="submit">{submitting ? "Saving response…" : "Submit response"}</button>}
      </form>
      {message && <p className="poll-message" role="status">{message}</p>}
      {error && <p className="poll-error" role="alert">{error}</p>}
      {loadError ? <div className="poll-error" role="status"><p>{loadError}</p><button className="poll-text-button" onClick={refresh} disabled={loading}>{loading ? "Retrying…" : "Retry loading polls"}</button></div> : loading && !result ? <p className="poll-note" role="status">Loading poll…</p> : null}
      {result && <div className="poll-result-controls"><button className="poll-text-button" onClick={() => setShowResults(!showResults)} aria-expanded={showResults} aria-controls={`results-${poll.id}`}>{showResults ? "Hide results" : "View results"}</button><span>{result.total?.toLocaleString()} {result.total === 1 ? "response" : "responses"}</span></div>}
      {showResults && result && <div className="poll-results" id={`results-${poll.id}`} aria-label="Poll results">
        {result.total === 0 && <p className="poll-note">No responses yet.</p>}
        {result.options.map(option => {
          const count = option.count || 0;
          const percent = result.total ? Math.round(count / result.total * 100) : 0;
          return <div className="poll-result" key={option.id}><div><strong>{option.label}</strong><span>{percent}% <small>({count.toLocaleString()})</small></span></div><div className="poll-result-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div></div>;
        })}
        <button className="poll-text-button" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh results"}</button>
      </div>}
      <p className="poll-note">Informal visitor poll, not a representative survey. No name or email required. <Link to="/privacy#opinion-polls">Poll privacy</Link></p>
    </div>
  );
}
