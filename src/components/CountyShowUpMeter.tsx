import type { CountySite } from "../data/counties";
import { useCountyTurnout } from "../lib/useCountyTurnout";

const numberFormatter = new Intl.NumberFormat("en-US");

export function CountyShowUpMeter({ county, className = "" }: { county: CountySite; className?: string }) {
  const turnout = useCountyTurnout(county.fips);
  const latest = turnout.data[0];
  const priorElections = turnout.data.slice(1, 4);
  const sectionClassName = ["county-show-up-section", className].filter(Boolean).join(" ");

  return (
    <section className={sectionClassName} aria-label={`${county.displayName} show up meter`}>
      <div className="show-up-meter" aria-live="polite">
        <p className="eyebrow">Operation Show Up</p>
        <h2>{county.displayName} Show Up Meter</h2>
        {turnout.loading ? (
          <p>Loading latest turnout data...</p>
        ) : latest ? (
          <>
            <p>
              <strong>{numberFormatter.format(latest.ballotsCast)}</strong> out of{" "}
              <strong>{numberFormatter.format(latest.registeredVoters)}</strong> registered voters cast a ballot.
            </p>
            <div className="show-up-meter-track" role="img" aria-label={`${latest.turnoutPct.toFixed(1)}% turnout`}>
              <div className="show-up-meter-fill" style={{ width: `${latest.turnoutPct.toFixed(2)}%` }} />
            </div>
            <p className="show-up-meter-meta">
              {latest.turnoutPct.toFixed(1)}% turnout | {latest.electionLabel}
            </p>
            {priorElections.length > 0 ? (
              <ul className="show-up-meter-history">
                {priorElections.map((entry) => (
                  <li key={entry.electionId}>
                    <strong>{entry.electionLabel}:</strong> {entry.turnoutPct.toFixed(1)}%
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="show-up-meter-note">
              2025-2026 county turnout is published state-by-state, so coverage will expand as those official files are added.
            </p>
          </>
        ) : (
          <p>Turnout data is not available for this county yet.</p>
        )}
      </div>
    </section>
  );
}
