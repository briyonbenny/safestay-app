/**
 * API helpers for the SafeStay Node backend (Express app in ../web technolagy at repo root).
 * When VITE_API_BASE_URL is set, requests go there (production: Render static + Web Service).
 * In dev, .env.development sets VITE_USE_API; leave BASE unset so Vite proxies /api → localhost:3000.
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const truthyEnv = (v) => {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};

/**
 * When true, app uses the Node API (session cookies + Mongo) for listings, auth, and messaging.
 * Set on Render (build env): VITE_USE_API=true and VITE_API_BASE_URL=https://your-api.onrender.com
 */
export const isApiModeEnabled = () =>
  truthyEnv(import.meta.env.VITE_USE_API) || Boolean(String(import.meta.env.VITE_API_BASE_URL || "").trim());

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
    /** Present when using API; used to show delete / owner-only actions */
    ownerId: (() => {
      const o = row.owner;
      if (!o) return null;
      if (typeof o === 'string') return o;
      const id = o.id ?? o._id;
      return id != null ? String(id) : null;
    })(),
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
