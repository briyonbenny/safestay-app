/**
 * API helpers for the SafeStay Node backend. When VITE_API_BASE_URL is set, requests go there
 * (production: separate Render static + Web Service). In dev, leave it unset and use Vite proxy
 * to localhost:3000 for same-origin cookies.
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** When true, app uses the Node API (session cookies + Mongo). Set VITE_USE_API=true and/or VITE_API_BASE_URL. */
export const isApiModeEnabled = () =>
  import.meta.env.VITE_USE_API === "true" || Boolean(String(import.meta.env.VITE_API_BASE_URL || "").trim());

export const getApiBase = () => base;

export const apiUrl = (path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base) return `${base}${p}`;
  return p;
};

export async function apiFetch(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
    },
  });
  return res;
}

export function mapApiListingToCard(row) {
  if (!row) return null;
  return {
    id: String(row._id),
    title: row.title,
    location: row.location,
    price: row.price,
    propertyType: row.propertyType,
    description: row.description,
    isVerified: Boolean(row.isVerified),
    ownerName: row.owner?.fullName || row.owner?.email || "Host",
    images: Array.isArray(row.images) ? row.images : [],
    imageHint: "room-1",
  };
}

export function publicImageUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("blob:")) return pathOrUrl;
  if (base) return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  return pathOrUrl;
}
