import { useEffect, useMemo, useRef, useState } from "react";
import type { CountySite } from "../data/counties";
import itmTradingAd from "../../../the-county-post/ad-assets/ad-itmtrading.JPG";

type WeatherSponsor = {
  name: string;
  href: string;
};

type WeatherStatus = {
  label: string;
  temperature?: number;
  condition?: string;
  windSpeed?: number;
  updatedAt?: string;
  loading: boolean;
};

type GeocodingResult = {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country_code?: string;
};

type TigerWebCountyResponse = {
  features?: Array<{
    attributes?: {
      BASENAME?: string;
      CENTLAT?: string;
      CENTLON?: string;
      INTPTLAT?: string;
      INTPTLON?: string;
      GEOID?: string;
    };
  }>;
};

type WeatherResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

type MetalQuote = {
  price: number;
  currency: string;
  change_abs: number;
};

type PreciousMetalsResponse = {
  data: Record<"gold" | "silver" | "platinum" | "palladium", MetalQuote>;
};

const itmTradingUrl = "https://www.itmtrading.com/";

const marketSymbols = [
  { proName: "AMEX:SPY", title: "S&P 500" },
  { proName: "NASDAQ:QQQ", title: "Nasdaq 100" },
  { proName: "AMEX:GLD", title: "Gold" },
  { proName: "AMEX:SLV", title: "Silver" },
  { proName: "AMEX:DBA", title: "Agriculture" },
  { proName: "AMEX:CORN", title: "Corn" },
  { proName: "AMEX:WEAT", title: "Wheat" },
  { proName: "AMEX:USO", title: "Crude Oil" },
  { proName: "NYSE:CVX", title: "Chevron" },
  { proName: "NASDAQ:TSLA", title: "Tesla" },
];

export function TopTicker({ county, weatherSponsor }: { county?: CountySite; weatherSponsor?: WeatherSponsor }) {
  return (
    <section className={county ? "market-weather-stack market-weather-stack-with-weather" : "market-weather-stack"} aria-label="Market ticker and local weather">
      <div className="market-weather-bar market-weather-bar-ticker-only">
        <TradingViewTicker />
      </div>
      <PreciousMetalsTicker />
      {county ? (
        <div className="market-weather-weather-bar">
          <CountyWeather county={county} weatherSponsor={weatherSponsor} />
        </div>
      ) : null}
    </section>
  );
}

function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.textContent = "";
    const widgetRoot = document.createElement("div");
    widgetRoot.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: marketSymbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "light",
      locale: "en",
    });

    container.append(widgetRoot, script);

    return () => {
      container.textContent = "";
    };
  }, []);

  return <div className="tradingview-widget-container market-ticker-widget" ref={containerRef} />;
}

function PreciousMetalsTicker() {
  const [quotes, setQuotes] = useState<PreciousMetalsResponse["data"]>();

  useEffect(() => {
    const controller = new AbortController();
    const loadQuotes = () => {
      fetch("https://aurumrates.com/api/v1/spot", { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Metal prices unavailable");
          return response.json() as Promise<PreciousMetalsResponse>;
        })
        .then((data) => setQuotes(data.data))
        .catch(() => {
          if (!controller.signal.aborted) setQuotes(undefined);
        });
    };

    loadQuotes();
    const refresh = window.setInterval(loadQuotes, 30 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(refresh);
    };
  }, []);

  const metals = [
    ["gold", "Gold"],
    ["silver", "Silver"],
    ["platinum", "Platinum"],
    ["palladium", "Palladium"],
  ] as const;

  return (
    <aside className="precious-metals-ticker" aria-label="Precious metals prices">
      <div className="precious-metals-quotes">
        {metals.map(([key, label]) => {
          const quote = quotes?.[key];
          const change = quote?.change_abs;

          return (
            <a
              key={key}
              className="precious-metal-quote"
              href={itmTradingUrl}
              target="_blank"
              rel="noreferrer sponsored"
              aria-label={`${label} price, presented by ITM Trading`}
            >
              <span>{label}</span>
              <strong>{quote ? formatMetalPrice(quote.price) : "Loading…"}</strong>
              {change !== undefined ? (
                <small className={change >= 0 ? "positive" : "negative"}>
                  {change >= 0 ? "+" : "−"}{formatMetalPrice(Math.abs(change))}
                </small>
              ) : null}
            </a>
          );
        })}
      </div>
      <a className="precious-metals-sponsor" href={itmTradingUrl} target="_blank" rel="noreferrer sponsored">
        <span>Presented by ITM Trading</span>
        <img src={itmTradingAd} alt="ITM Trading" />
      </a>
    </aside>
  );
}

function formatMetalPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function CountyWeather({ county, weatherSponsor }: { county?: CountySite; weatherSponsor?: WeatherSponsor }) {
  const [weather, setWeather] = useState<WeatherStatus>(() => ({
    label: county ? weatherLocationName(county) : "Local weather",
    loading: Boolean(county),
  }));
  const locationName = useMemo(() => (county ? weatherLocationName(county) : ""), [county]);

  useEffect(() => {
    let active = true;

    if (!county) {
      setWeather({ label: "Choose a county for local weather", loading: false });
      return;
    }

    setWeather({ label: locationName, loading: true });
    fetchCountyWeather(county)
      .then((nextWeather) => {
        if (active) setWeather(nextWeather);
      })
      .catch(() => {
        if (active) setWeather({ label: locationName, condition: "Weather unavailable", loading: false });
      });

    return () => {
      active = false;
    };
  }, [county, locationName]);

  if (weather.loading) {
    return (
      <span className="weather-pill">
        <span aria-hidden="true">...</span>
        <span>{weather.label} weather loading</span>
      </span>
    );
  }

  if (typeof weather.temperature !== "number") {
    return (
      <span className="weather-pill">
        <span aria-hidden="true">--</span>
        <span>{weather.condition || weather.label}</span>
      </span>
    );
  }

  return (
    <span className="weather-pill" title={weather.updatedAt ? `Updated ${weather.updatedAt}` : undefined}>
      <span aria-hidden="true">{weatherIcon(weather.condition)}</span>
      <strong>{weather.label}</strong>
      <span>{Math.round(weather.temperature)}{"\u00b0F"}</span>
      {weather.condition ? <span>{weather.condition}</span> : null}
      {typeof weather.windSpeed === "number" ? <span>Wind {Math.round(weather.windSpeed)} mph</span> : null}
      {weatherSponsor ? (
        <span className="weather-presented-by">
          Presented by <a href={weatherSponsor.href}>{weatherSponsor.name}</a>
        </span>
      ) : null}
    </span>
  );
}

async function fetchCountyWeather(county: CountySite): Promise<WeatherStatus> {
  const location = await geocodeCounty(county);
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,weather_code,wind_speed_10m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "1",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error("Weather request failed");
  const data = (await response.json()) as WeatherResponse;
  const current = data.current;

  return {
    label: location.name,
    temperature: current?.temperature_2m,
    condition: weatherDescription(current?.weather_code),
    windSpeed: current?.wind_speed_10m,
    updatedAt: current?.time,
    loading: false,
  };
}

async function geocodeCounty(county: CountySite): Promise<GeocodingResult> {
  const cached = readCachedLocation(county);
  if (cached) return cached;

  if (county.primaryCity) {
    const primaryCityLocation = await geocodePrimaryCity(county);
    if (primaryCityLocation) {
      cacheLocation(county, primaryCityLocation);
      return primaryCityLocation;
    }
  }

  const countyLocation = await fetchCountyCentroid(county);
  cacheLocation(county, countyLocation);
  return countyLocation;
}

async function geocodePrimaryCity(county: CountySite): Promise<GeocodingResult | undefined> {
  if (!county.primaryCity) return undefined;

  const params = new URLSearchParams({
    name: county.primaryCity,
    count: "10",
    language: "en",
    format: "json",
    countryCode: "US",
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) return undefined;
  const data = (await response.json()) as { results?: GeocodingResult[] };
  const match = data.results?.find((result) => result.admin1 === county.state.name && result.country_code === "US");
  if (!match) return undefined;

  return {
    latitude: match.latitude,
    longitude: match.longitude,
    name: county.primaryCity,
    admin1: match.admin1,
    country_code: match.country_code,
  };
}

async function fetchCountyCentroid(county: CountySite): Promise<GeocodingResult> {
  const stateFips = county.fips.slice(0, 2);
  const countyFips = county.fips.slice(2);
  const params = new URLSearchParams({
    where: `STATE='${stateFips}' AND COUNTY='${countyFips}'`,
    outFields: "BASENAME,CENTLAT,CENTLON,INTPTLAT,INTPTLON,GEOID",
    returnGeometry: "false",
    f: "json",
  });
  const response = await fetch(`https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/82/query?${params.toString()}`);
  if (!response.ok) throw new Error("County coordinate request failed");
  const data = (await response.json()) as TigerWebCountyResponse;
  const attributes = data.features?.[0]?.attributes;
  const latitude = Number(attributes?.INTPTLAT || attributes?.CENTLAT);
  const longitude = Number(attributes?.INTPTLON || attributes?.CENTLON);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("No county coordinates found");
  }

  return {
    latitude,
    longitude,
    name: county.displayName,
    admin1: county.state.name,
    country_code: "US",
  };
}

function weatherLocationName(county: CountySite) {
  return county.primaryCity || county.displayName;
}

function locationCacheKey(county: CountySite) {
  return `pia-weather-location:v2:${county.state.slug}/${county.slug}`;
}

function readCachedLocation(county: CountySite) {
  try {
    const value = window.localStorage.getItem(locationCacheKey(county));
    if (!value) return undefined;
    return JSON.parse(value) as GeocodingResult;
  } catch {
    return undefined;
  }
}

function cacheLocation(county: CountySite, location: GeocodingResult) {
  try {
    window.localStorage.setItem(locationCacheKey(county), JSON.stringify(location));
  } catch {
    // If storage is blocked, the next page load can geocode again.
  }
}

function weatherDescription(code?: number) {
  if (code === undefined) return undefined;
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather";
}

function weatherIcon(condition?: string) {
  if (!condition) return "WX";
  if (condition.includes("Clear")) return "Sun";
  if (condition.includes("cloud") || condition.includes("Overcast")) return "Cloud";
  if (condition.includes("Rain") || condition.includes("Drizzle")) return "Rain";
  if (condition.includes("Snow")) return "Snow";
  if (condition.includes("Thunderstorm")) return "Storm";
  return "WX";
}
