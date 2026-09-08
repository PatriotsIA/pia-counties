import { getCountiesForState } from "../data/counties";

export function CandidateCountyCoverage({ stateSlug, selected = [] }: { stateSlug: string; selected?: string[] }) {
  return <details className="candidate-county-coverage">
    <summary>Additional counties covered by this race</summary>
    <p>Select counties touched by a district or city that crosses county lines. Statewide races automatically appear in every county in the state.</p>
    <div className="candidate-county-options">
      {getCountiesForState(stateSlug).map((county) => <label className="checkbox-row" key={county.fips}>
        <input type="checkbox" name="countySlugs" value={county.slug} defaultChecked={selected.includes(county.slug)} />
        <span>{county.displayName}</span>
      </label>)}
    </div>
  </details>;
}
