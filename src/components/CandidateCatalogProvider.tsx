import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { candidates as staticCandidates, type Candidate } from "../data/candidates";
import { candidateApiIsConfigured, fetchApprovedCandidates } from "../lib/candidate-api";
import { CandidateCatalogContext } from "../lib/candidate-catalog-context";

function normalizeCandidates(remoteCandidates: Candidate[]) {
  const catalog = new Map<string, Candidate>();
  remoteCandidates.forEach((candidate) => {
    if (candidate?.id && candidate.name && candidate.office) {
      catalog.set(candidate.id.toLowerCase(), { ...candidate, id: candidate.id.toLowerCase() });
    }
  });
  return [...catalog.values()];
}

export function CandidateCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Candidate[]>(staticCandidates);
  const [loading, setLoading] = useState(candidateApiIsConfigured());
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!candidateApiIsConfigured()) {
      setCatalog(staticCandidates);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setCatalog(normalizeCandidates(await fetchApprovedCandidates()));
      setError(undefined);
    } catch (nextError) {
      setCatalog(staticCandidates);
      setError(nextError instanceof Error ? nextError.message : "Candidate directory could not be refreshed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const value = useMemo(() => ({ candidates: catalog, loading, error, refresh }), [catalog, error, loading, refresh]);
  return <CandidateCatalogContext.Provider value={value}>{children}</CandidateCatalogContext.Provider>;
}
