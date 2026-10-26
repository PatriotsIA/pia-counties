import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import catalog from "../data/issue-polls.json";
import config from "../data/issues-poll-api.json";
import { recoverAmerica } from "../data/recover-america";
import { OpinionPoll, type Poll } from "./OpinionPoll";
import "./IssuesPage.css";

const issues = [
  { id: "paper-voting", title: "Paper Voting", organization: "Patriots for Paper", category: "Elections & verification", description: "Explore voter-verifiable paper ballots, transparent counting, and post-election audits. Patriots for Paper offers information and practical resources for learning about election processes in your community.", href: "https://www.patriotsforpaper.com/", link: "Visit Patriots for Paper", image: "/partners/patriots-for-paper.svg" },
  { id: "protect-children", title: "Stop the Sexualization of Children", organization: "Recover America", category: "Parents & public education", description: "Learn about Recover America’s Protect Children initiative, its goals for school and library material policies, and its partnership with PIA. Read the full pledge and decide whether to participate.", href: "/recover-america", link: "Explore Recover America", image: recoverAmerica.logo },
  { id: "constitutional-law", title: "Sharia Watch", organization: "Texas Sharia Watch", category: "Law & constitutional rights", description: "Review the published Texas Republican Party legislative priority, its source, and related reading. Texas Sharia Watch also offers a pledge supporting constitutional government, equal protection, and equal enforcement of Texas law.", href: "https://preview.d24saaaq598sfl.amplifyapp.com/", link: "Visit Texas Sharia Watch", image: "/partners/sharia-watch.webp" },
];
const pollsById = Object.fromEntries(catalog.map(poll => [poll.id, poll]));

async function readPolls(signal?: AbortSignal): Promise<Poll[]> {
  const response = await fetch(`${config.url}/polls`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Poll results are temporarily unavailable.");
  const body = await response.json();
  if (!Array.isArray(body.polls) || !catalog.every(poll => body.polls.some((p: Poll) => p.id === poll.id && p.version === poll.version && typeof p.total === "number" && p.options.length === poll.options.length))) throw new Error("Poll questions have changed. Reload this page to continue.");
  return body.polls;
}

export function IssuesPage() {
  const [results, setResults] = useState<Record<string, Poll>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback((signal?: AbortSignal) => readPolls(signal).then(polls => {
      if (signal?.aborted) return;
      // An earlier read must not replace the count returned by a later vote.
      setResults(current => Object.fromEntries(polls.map(poll => [poll.id, (current[poll.id]?.total || 0) > (poll.total || 0) ? current[poll.id] : poll]))); setError("");
    }).catch(cause => {
      if (signal?.aborted) return;
      setError(cause instanceof Error && cause.name === "Error" ? cause.message : "Poll results could not be loaded. Please try again.");
    }).finally(() => { if (!signal?.aborted) setLoading(false); }), []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return <article className="issues-page">
    <header className="issues-hero">
      <p className="issues-eyebrow">Patriots in Action · Issues</p>
      <h1>Get informed.<br /><em>Share your perspective.</em></h1>
      <p>Explore the issues, learn about the initiatives, and tell us what you think. Each topic includes resources and an opinion poll open to site visitors.</p>
      <nav aria-label="Jump to an issue" className="issues-jump">{issues.map((issue, index) => <a href={`#${issue.id}`} key={issue.id}><span>0{index + 1}</span>{index === 1 ? "Protect Children" : issue.title}<span aria-hidden="true">↓</span></a>)}</nav>
    </header>
    <div className="issues-intro"><strong>Explore. Consider. Participate.</strong><p>Read about each initiative before sharing your view. Polls are separate from the organizations’ pledges and sign-up forms.</p></div>
    {issues.map((issue, index) => <section className="issue-section" id={issue.id} key={issue.id} aria-labelledby={`issue-${issue.id}`}>
      <div className="issue-copy">
        <p className="issues-eyebrow"><span>0{index + 1}</span> {issue.category}</p>
        <div className={`issue-brand issue-brand-${issue.id}`}><img src={issue.image} alt={issue.organization} loading="lazy" /></div>
        <p className="issue-organization">{issue.organization}</p>
        <h2 id={`issue-${issue.id}`}>{issue.title}</h2>
        <p className="issue-description">{issue.description}</p>
        {issue.href.startsWith("/") ? <Link className="issue-link" to={issue.href}>{issue.link} <span aria-hidden="true">→</span></Link> : <a className="issue-link" href={issue.href} target="_blank" rel="noopener noreferrer">{issue.link} <span aria-hidden="true">↗</span></a>}
        {issue.id === "protect-children" && <a className="issue-secondary-link" href={recoverAmerica.pledge} target="_blank" rel="noopener noreferrer">Read the official Protect Children pledge ↗</a>}
      </div>
      <OpinionPoll poll={pollsById[issue.id]} result={results[issue.id]} loading={loading} loadError={error} refresh={() => { setLoading(true); void refresh(); }} onResult={poll => setResults(current => ({ ...current, [poll.id]: (current[poll.id]?.total || 0) > (poll.total || 0) ? current[poll.id] : poll }))} />
    </section>)}
    <aside className="issues-methodology"><h2>About these opinion polls</h2><p>Participation is voluntary. Results reflect responses submitted by visitors to this page and do not represent all PIA members, voters, or the public. Each browser can submit one response per question; this does not verify a person’s identity or prevent the same person from using another browser. Percentages are rounded and may not add up to 100%.</p><p>Submitting a poll response does not sign a pledge, subscribe you to messages, or make a donation.</p></aside>
  </article>;
}
