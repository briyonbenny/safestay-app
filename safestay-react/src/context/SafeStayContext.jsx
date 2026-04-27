import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { seedListings } from '../data/mockListings.js';

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
  const [listings, setListings] = useState(() => seedListings());
  // user: { email, role: 'student' | 'owner' } | null
  const [user, setUser] = useState(() => readSession());
  const [favouriteIds, setFavouriteIds] = useState(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favouriteIds));
    } catch {
      /* storage quota / private mode */
    }
  }, [favouriteIds]);

  const addListing = useCallback((payload) => {
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
    };
    setListings((prev) => [newItem, ...prev]);
    return newItem;
  }, [user?.email]);

  const toggleFavourite = useCallback((id) => {
    setFavouriteIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return [...s];
    });
  }, []);

  const isFavourite = useCallback(
    (id) => favouriteIds.includes(id),
    [favouriteIds]
  );

  // Remember which role was chosen at registration so a later sign-in can restore it.
  const saveAccountRole = useCallback((email, role) => {
    try {
      const next = { ...loadRoles() };
      next[email] = role;
      localStorage.setItem(ROLES_KEY, JSON.stringify(next));
    } catch {
      /* no storage */
    }
  }, []);

  const getRoleForEmail = useCallback((email) => {
    const roles = loadRoles();
    return roles[email] === 'owner' ? 'owner' : 'student';
  }, []);

  const login = useCallback(
    (u) => {
      setUser(u);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch {
        /* */
      }
    },
    []
  );

  const logout = useCallback(() => {
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
      login,
      logout,
      addListing,
      saveAccountRole,
      getRoleForEmail,
      favouriteIds,
      toggleFavourite,
      isFavourite,
    }),
    [
      listings,
      user,
      login,
      logout,
      addListing,
      saveAccountRole,
      getRoleForEmail,
      favouriteIds,
      toggleFavourite,
      isFavourite,
    ]
  );

  return <SafeStayContext.Provider value={value}>{children}</SafeStayContext.Provider>;
};

/* Context hook: separate export for consumers ( eslint react-refresh: hook file ). */
// eslint-disable-next-line react-refresh/only-export-components
export const useSafeStay = () => {
  const c = useContext(SafeStayContext);
  if (!c) {
    throw new Error('useSafeStay must be used under SafeStayProvider');
  }
  return c;
};
