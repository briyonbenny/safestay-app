import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { seedListings } from '../data/mockListings.js';
import {
  apiFetch,
  getApiBase,
  isApiModeEnabled,
  mapApiListingToCard,
} from '../api/safeStayApi.js';

const FAV_KEY = 'safestay_favourites_v1';
const USER_KEY = 'safestay_session_v1';
const ROLES_KEY = 'safestay_account_roles_v1';
/** Mock mode: persist listings in the browser. */
const MOCK_LISTINGS_KEY = 'safestay_listings_v1';

const loadMockListingsFromStorage = () => {
  try {
    const raw = localStorage.getItem(MOCK_LISTINGS_KEY);
    if (raw) {
      const a = JSON.parse(raw);
      if (Array.isArray(a) && a.length > 0) return a;
    }
  } catch {
    /* */
  }
  return seedListings();
};

const listingsSafeForStorage = (rows) =>
  rows.map((l) => ({
    ...l,
    // blob: URLs are invalid after reload; do not persist them
    images: Array.isArray(l.images) ? l.images.filter((u) => u && !String(u).startsWith('blob:')) : [],
  }));

const loadRoles = () => {
  try {
    return JSON.parse(localStorage.getItem(ROLES_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const readSession = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    const role = String(p?.role || '').toLowerCase();
    if (p && typeof p.email === 'string' && (role === 'student' || role === 'owner')) {
      return { ...p, role };
    }
  } catch {
    /* ignore */
  }
  return null;
};

const SafeStayContext = createContext(null);

export const SafeStayProvider = ({ children }) => {
  const apiMode = isApiModeEnabled();
  const [listings, setListings] = useState(() => (apiMode ? [] : loadMockListingsFromStorage()));
  // localStorage may be ahead of the server; refreshMe fixes that.
  const [user, setUser] = useState(() => readSession());
  const [apiReady, setApiReady] = useState(!apiMode);
  const [favouriteIds, setFavouriteIds] = useState(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const loadListingsFromApi = useCallback(async () => {
    try {
      const res = await apiFetch('/api/listings');
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const rows = data.listings || [];
      setListings(rows.map(mapApiListingToCard).filter(Boolean));
    } catch {
      /* ignore listing load errors */
    }
  }, []);

  const applyServerUser = useCallback(
    async (su) => {
      if (!su) return;
      const next = { email: su.email, role: su.role, fullName: su.fullName, id: su.id };
      setUser(next);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(next));
      } catch {
        /* */
      }
      await loadListingsFromApi();
    },
    [loadListingsFromApi]
  );

  const refreshMe = useCallback(async () => {
    if (!isApiModeEnabled()) return;
    try {
      const r = await apiFetch('/api/auth/me');
      if (r.status === 401) {
        setUser(null);
        try {
          localStorage.removeItem(USER_KEY);
        } catch {
          /* */
        }
        return;
      }
      if (!r.ok) return;
      const { user: u } = await r.json();
      if (u) {
        const next = { email: u.email, role: u.role, fullName: u.fullName, id: u.id };
        setUser(next);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(next));
        } catch {
          /* */
        }
      }
    } catch {
      /* offline */
    }
  }, []);

  /** Re-read /me after a write without clearing the user on one failure. */
  const softSyncUserFromServer = useCallback(async () => {
    if (!isApiModeEnabled()) return;
    try {
      const r = await apiFetch('/api/auth/me');
      if (!r.ok) return;
      const { user: u } = await r.json();
      if (u) {
        const next = { email: u.email, role: u.role, fullName: u.fullName, id: u.id };
        setUser(next);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(next));
        } catch {
          /* */
        }
      }
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (!isApiModeEnabled()) {
      return;
    }
    let cancel = false;
    (async () => {
      try {
        await refreshMe();
        if (!cancel) await loadListingsFromApi();
      } catch {
        /* guard */
      } finally {
        if (!cancel) setApiReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [loadListingsFromApi, refreshMe]);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favouriteIds));
    } catch {
      /* storage */
    }
  }, [favouriteIds]);

  useEffect(() => {
    if (isApiModeEnabled()) return;
    try {
      localStorage.setItem(MOCK_LISTINGS_KEY, JSON.stringify(listingsSafeForStorage(listings)));
    } catch {
      /* storage */
    }
  }, [listings]);

  const addListing = useCallback(
    async (payload) => {
      if (!isApiModeEnabled()) {
        const id = String(Date.now());
        const newItem = {
          id,
          title: payload.title,
          location: payload.location,
          price: payload.price,
          propertyType: payload.propertyType,
          description: payload.description,
          isVerified: false,
          ownerName: user?.email || 'You',
          imageHint: 'new',
          images: Array.isArray(payload.imagePreviewUrls) && payload.imagePreviewUrls.length
            ? payload.imagePreviewUrls
            : [],
        };
        setListings((prev) => [newItem, ...prev]);
        return newItem;
      }

      let imagesDataUrls = [];
      if (Array.isArray(payload.imageFiles) && payload.imageFiles.length) {
        const slice = payload.imageFiles.slice(0, 8);
        try {
          imagesDataUrls = await Promise.all(
            slice.map(
              (file) =>
                new Promise((resolve, reject) => {
                  const fr = new FileReader();
                  fr.onload = () => resolve(fr.result);
                  fr.onerror = () => reject(new Error('Could not read a photo file.'));
                  fr.readAsDataURL(file);
                })
            )
          );
        } catch (readErr) {
          throw new Error(readErr && readErr.message ? readErr.message : 'Could not read photos.');
        }
      }

      const res = await apiFetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(payload.title),
          location: String(payload.location),
          propertyType: String(payload.propertyType),
          description: String(payload.description),
          price: Number(payload.price),
          isVerified: Boolean(payload.isVerified),
          imagesDataUrls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            data.error ||
              'Not signed in on the server. Log out, log in as an owner, and try again.'
          );
        }
        throw new Error(data.error || data.errors?.[0] || 'Could not create listing.');
      }
      const created = mapApiListingToCard(data.listing);
      if (!created?.id) {
        throw new Error('Listing was not returned. Retry.');
      }
      setListings((prev) => [created, ...prev]);
      await softSyncUserFromServer();
      return created;
    },
    [user?.email, softSyncUserFromServer]
  );

  const deleteListing = useCallback(async (id) => {
    if (isApiModeEnabled()) {
      const res = await apiFetch(`/api/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not delete listing.');
      }
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const toggleFavourite = useCallback(
    async (id) => {
      if (isApiModeEnabled()) {
        try {
          const res = await apiFetch(`/api/listings/${id}/favourite`, { method: 'POST' });
          if (res.ok) {
            setFavouriteIds((prev) => {
              const s = new Set(prev);
              if (s.has(id)) s.delete(id);
              else s.add(id);
              return [...s];
            });
          }
          return;
        } catch {
          /* local fallback */
        }
      }
      setFavouriteIds((prev) => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id);
        else s.add(id);
        return [...s];
      });
    },
    []
  );

  const isFavourite = useCallback(
    (id) => favouriteIds.includes(id),
    [favouriteIds]
  );

  const saveAccountRole = useCallback((email, role) => {
    try {
      const next = { ...loadRoles() };
      next[email] = role;
      localStorage.setItem(ROLES_KEY, JSON.stringify(next));
    } catch {
      /* */
    }
  }, []);

  const getRoleForEmail = useCallback((email) => {
    const roles = loadRoles();
    return roles[email] === 'owner' ? 'owner' : 'student';
  }, []);

  const login = useCallback(
    async (u) => {
      if (isApiModeEnabled() && u._password != null) {
        const { _password, ...rest } = u;
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: rest.email, password: _password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Login failed.');
        }
        const { user: su } = data;
        if (su) {
          const next = { email: su.email, role: su.role, fullName: su.fullName, id: su.id };
          setUser(next);
          try {
            localStorage.setItem(USER_KEY, JSON.stringify(next));
          } catch {
            /* */
          }
        }
        let me = await apiFetch('/api/auth/me');
        for (let attempt = 0; attempt < 5 && me.status === 401; attempt++) {
          await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
          me = await apiFetch('/api/auth/me');
        }
        if (me.ok) {
          const body = await me.json().catch(() => ({}));
          const u2 = body.user;
          if (u2) {
            const next = { email: u2.email, role: u2.role, fullName: u2.fullName, id: u2.id };
            setUser(next);
            try {
              localStorage.setItem(USER_KEY, JSON.stringify(next));
            } catch {
              /* */
            }
          }
        } else if (su) {
          const api = getApiBase() || '/api (proxied)';
          throw new Error(
            `Signed in but the session cookie did not stick (API: ${api}). ` +
              'Match host/port with VITE_API_BASE_URL, avoid mixing localhost and 127.0.0.1, restart API and Vite, then log in again.'
          );
        }
        await loadListingsFromApi();
        return;
      }
      setUser(u);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch {
        /* */
      }
    },
    [loadListingsFromApi]
  );

  const logout = useCallback(async () => {
    if (isApiModeEnabled()) {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch {
        /* */
      }
    }
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* */
    }
  }, []);

  const value = useMemo(
    () => ({
      listings,
      setListings,
      user,
      apiMode,
      apiReady,
      login,
      logout,
      addListing,
      saveAccountRole,
      getRoleForEmail,
      favouriteIds,
      toggleFavourite,
      isFavourite,
      loadListingsFromApi,
      applyServerUser,
      deleteListing,
    }),
    [
      listings,
      user,
      apiMode,
      apiReady,
      login,
      logout,
      addListing,
      saveAccountRole,
      getRoleForEmail,
      favouriteIds,
      toggleFavourite,
      isFavourite,
      loadListingsFromApi,
      applyServerUser,
      deleteListing,
    ]
  );

  return <SafeStayContext.Provider value={value}>{children}</SafeStayContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSafeStay = () => {
  const c = useContext(SafeStayContext);
  if (!c) {
    throw new Error('useSafeStay must be used under SafeStayProvider');
  }
  return c;
};
