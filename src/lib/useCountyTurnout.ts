import { useEffect, useState } from "react";
import { getCountyTurnoutHistoryByFips, type CountyTurnoutSummary } from "./turnout";

type CountyTurnoutState = {
  loading: boolean;
  data: CountyTurnoutSummary[];
  loadedFips: string | null;
};

export function useCountyTurnout(fips: string) {
  const [state, setState] = useState<CountyTurnoutState>({ loading: true, data: [], loadedFips: null });

  useEffect(() => {
    let active = true;

    getCountyTurnoutHistoryByFips(fips)
      .then((data) => {
        if (!active) return;
        setState({ loading: false, data, loadedFips: fips });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, data: [], loadedFips: fips });
      });

    return () => {
      active = false;
    };
  }, [fips]);

  if (state.loadedFips !== fips) {
    return { loading: true, data: [] };
  }

  return { loading: state.loading, data: state.data };
}
