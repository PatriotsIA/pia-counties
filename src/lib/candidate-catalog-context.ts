import { createContext, useContext } from "react";
import { candidates as staticCandidates, type Candidate } from "../data/candidates";

export type CandidateCatalogContextValue = {
  candidates: Candidate[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

export const CandidateCatalogContext = createContext<CandidateCatalogContextValue>({
  candidates: staticCandidates,
  loading: false,
  refresh: async () => {},
});

export function useCandidateCatalog() {
  return useContext(CandidateCatalogContext);
}
