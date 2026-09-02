const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

export const hasApiBaseUrl = Boolean(apiBaseUrl);

export function apiUrl(path: string) {
  if (!apiBaseUrl) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}
