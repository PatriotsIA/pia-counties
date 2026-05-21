import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { getCountyCalendarFeed } from "./src/data/counties";
import { combineIcsFeeds, normalizeCalendarFeedUrl } from "./src/lib/calendar";

const defaultVimeoUser = "patriotsinactiontv";
const allowedVimeoUsers = new Set([defaultVimeoUser]);

function first(value: string | null) {
  return value || undefined;
}

function numberParam(value: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

function vimeoApiDevMiddleware(token: string | undefined): Plugin {
  return {
    name: "pia-vimeo-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/vimeo-showcase", async (request, response) => {
        const requestUrl = new URL(request.url || "", "http://localhost");
        const vimeoUser = (first(requestUrl.searchParams.get("user")) || defaultVimeoUser).trim().toLowerCase();

        if (!allowedVimeoUsers.has(vimeoUser)) {
          response.statusCode = 403;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Vimeo user is not allowed." }));
          return;
        }

        if (!token) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Missing Vimeo token." }));
          return;
        }

        const page = numberParam(first(requestUrl.searchParams.get("page")), 1, 50);
        const perPage = numberParam(first(requestUrl.searchParams.get("per_page")), 12, 50);
        const fields = [
          "uri",
          "name",
          "description",
          "link",
          "created_time",
          "release_time",
          "duration",
          "pictures.sizes.link",
          "pictures.sizes.width",
          "pictures.sizes.height",
          "player_embed_url",
          "paging.next",
          "paging.previous",
          "total",
        ].join(",");

        const url = new URL(`https://api.vimeo.com/users/${vimeoUser}/videos`);
        url.searchParams.set("page", String(page));
        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("fields", fields);
        url.searchParams.set("sort", "date");
        url.searchParams.set("direction", "desc");

        try {
          const vimeoResponse = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.vimeo.*+json;version=3.4",
            },
          });

          if (!vimeoResponse.ok) {
            response.statusCode = vimeoResponse.status === 429 ? 429 : 502;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "Vimeo feed could not be loaded." }));
            return;
          }

          response.statusCode = 200;
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(await vimeoResponse.text());
        } catch {
          response.statusCode = 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Vimeo feed could not be loaded." }));
        }
      });
    },
  };
}

function calendarApiDevMiddleware(): Plugin {
  return {
    name: "pia-calendar-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/calendar", async (request, response) => {
        const requestUrl = new URL(request.url || "", "http://localhost");
        const state = requestUrl.searchParams.get("state") || undefined;
        const county = requestUrl.searchParams.get("county") || undefined;
        const feedUrl = getCountyCalendarFeed(state, county);

        if (!feedUrl) {
          response.statusCode = 404;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Calendar feed is not configured for this county yet." }));
          return;
        }

        try {
          const feedResponse = await fetch(normalizeCalendarFeedUrl(feedUrl));
          if (!feedResponse.ok) {
            response.statusCode = feedResponse.status === 429 ? 429 : 502;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: `Upstream calendar status: ${feedResponse.status}.` }));
            return;
          }

          response.statusCode = 200;
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "text/calendar; charset=utf-8");
          response.end(combineIcsFeeds([await feedResponse.text()]));
        } catch {
          response.statusCode = 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Calendar feed could not be loaded." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const vimeoToken = env.PIA_VIMEO_ACCESS_TOKEN || env.VIMEO_ACCESS_TOKEN;

  return {
    plugins: [vimeoApiDevMiddleware(vimeoToken), calendarApiDevMiddleware(), react()],
  };
});
