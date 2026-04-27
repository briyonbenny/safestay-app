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
    if (p && typeof p.email === 'string' && (p.role === 'student' || p.role === 'owner')) {
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const SafeStayContext = createContext(null);

export const SafeStayProvider = ({ children }) => {
  const apiMode = isApiModeEnabled();
  const [listings, setListings] = useState(() => (apiMode ? [] : seedListings()));
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
    const res = await apiFetch('/api/listings');
    if (!res.ok) return;
    const data = await res.json();
    const rows = data.listings || [];
    setListings(rows.map(mapApiListingToCard).filter(Boolean));
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

  useEffect(() => {
    if (!isApiModeEnabled()) {
      return;
    }
    let cancel = false;
    (async () => {
      await Promise.all([refreshMe(), loadListingsFromApi()]);
      if (!cancel) setApiReady(true);
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

      const form = new FormData();
      form.set('title', String(payload.title));
      form.set('location', String(payload.location));
      form.set('propertyType', String(payload.propertyType));
      form.set('description', String(payload.description));
      form.set('price', String(payload.price));
      form.set('isVerified', payload.isVerified ? 'true' : 'false');
      if (Array.isArray(payload.imageFiles)) {
        payload.imageFiles.forEach((file) => {
          if (file) form.append('images', file);
        });
      }

      const base = getApiBase();
      const res = await fetch(
        base ? `${base}/api/listings` : '/api/listings',
        { method: 'POST', body: form, credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.errors?.[0] || 'Could not create listing.');
      }
      const created = mapApiListingToCard(data.listing);
      setListings((prev) => [created, ...prev]);
      return created;
    },
    [user?.email]
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
