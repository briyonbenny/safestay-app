// Fetch wrapper: session cookies, optional absolute base from VITE_API_BASE_URL.
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function networkHint(requestUrl) {
  if (base) {
    let renderNote = "";
    if (typeof window !== "undefined") {
      try {
        if (new URL(base).origin === window.location.origin) {
          renderNote =
            " VITE_API_BASE_URL must be your Render Web Service URL (the Node API), not this static site.";
        }
      } catch {
        /* ignore invalid base */
      }
    }
    return `No response from ${base}. Is the API running and is this URL correct? (${requestUrl})${renderNote}`;
  }
  let localNote =
    " Start the API in ../web technolagy (npm start), check the URL, and that Windows Firewall allows Node on port 3000.";
  if (typeof window !== "undefined" && /\.onrender\.com$/i.test(window.location.hostname)) {
    localNote =
      " On Render, a static site cannot run /api. Deploy ../web technolagy as a separate Web Service, set MONGODB_URI and CLIENT_ORIGIN, set VITE_API_BASE_URL to that API URL, then redeploy this static site.";
  }
  return `Cannot reach ${typeof window !== "undefined" ? window.location.origin : ""} (relative /api).${localNote} (Request: ${requestUrl})`;
}
const truthyEnv = (v) => {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};

/** True when the bundle should talk to the Node backend (env flag or base URL set). */
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
