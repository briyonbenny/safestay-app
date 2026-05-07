/**
 * API helpers for the SafeStay Node backend (Express app in ../web technolagy at repo root).
 * Production: set VITE_API_BASE_URL to your API URL (Render).
 * Local dev: .env.development sets VITE_API_BASE_URL=http://localhost:3000 so session cookies work with login
 * (the Vite /api proxy often loses Set-Cookie). Match localhost vs 127.0.0.1 with the URL you use in the browser.
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function networkHint(requestUrl) {
  if (base) {
    return `Cannot reach ${base}. Start the API in ../web technolagy (npm start), check the URL, and that Windows Firewall allows Node on port 3000. (Request: ${requestUrl})`;
  }
  return `Cannot reach /api (Vite proxies to port 3000). Start the API in ../web technolagy (npm start), then restart npm run dev. (Request: ${requestUrl})`;
}

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
  const url = apiUrl(path);
  try {
    return await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options.headers,
      },
    });
  } catch (e) {
    const looksNetwork =
      e instanceof TypeError ||
      (typeof e?.message === "string" && /failed to fetch|networkerror|load failed/i.test(e.message));
    if (looksNetwork) {
      throw new Error(networkHint(url));
    }
    throw e;
  }
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
