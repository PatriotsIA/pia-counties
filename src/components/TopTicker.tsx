import { useEffect, useRef, useState } from "react";
import type { CountySite } from "../data/counties";

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

type WeatherResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

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

export function TopTicker({ county }: { county?: CountySite }) {
  return (
    <section
      className={county ? "market-weather-bar market-weather-bar-with-weather" : "market-weather-bar market-weather-bar-ticker-only"}
      aria-label="Market ticker and local weather"
    >
      <TradingViewTicker />
      {county ? (
        <div className="market-weather-weather">
          <CountyWeather county={county} />
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

type CountyWeatherState = {
  countyKey: string;
  weather: WeatherStatus;
};

function CountyWeather({ county }: { county: CountySite }) {
  const countyKey = `${county.state.slug}/${county.slug}`;
  const locationName = weatherLocationName(county);
  const [weatherState, setWeatherState] = useState<CountyWeatherState | null>(null);
  const loading = !weatherState || weatherState.countyKey !== countyKey;
  const weather: WeatherStatus = loading ? { label: locationName, loading: true } : weatherState.weather;

  useEffect(() => {
    let active = true;

    fetchCountyWeather(county)
      .then((nextWeather) => {
        if (active) setWeatherState({ countyKey, weather: nextWeather });
      })
      .catch(() => {
        if (active) setWeatherState({ countyKey, weather: { label: locationName, condition: "Weather unavailable", loading: false } });
      });

    return () => {
      active = false;
    };
  }, [county, countyKey, locationName]);

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

  const searchNames = [county.primaryCity, `${county.name} County`, county.name].filter(Boolean) as string[];
  for (const name of searchNames) {
    const params = new URLSearchParams({
      name,
      count: "10",
      language: "en",
      format: "json",
      countryCode: "US",
    });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
    if (!response.ok) continue;
    const data = (await response.json()) as { results?: GeocodingResult[] };
    const match = data.results?.find((result) => result.admin1 === county.state.name) || data.results?.[0];
    if (match) {
      const location = {
        latitude: match.latitude,
        longitude: match.longitude,
        name: county.primaryCity || match.name || weatherLocationName(county),
        admin1: match.admin1,
        country_code: match.country_code,
      };
      cacheLocation(county, location);
      return location;
    }
  }

  throw new Error("No weather location found");
}

function weatherLocationName(county: CountySite) {
  return county.primaryCity || county.displayName;
}

function locationCacheKey(county: CountySite) {
  return `pia-weather-location:${county.state.slug}/${county.slug}`;
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
