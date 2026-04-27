import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { apiFetch, isApiModeEnabled, mapApiListingToCard } from '../api/safeStayApi.js';
import { ListingCard } from '../components/ListingCard.jsx';

/**
 * Owner: properties you have added (API: GET /api/listings/mine; mock: filter by owner name).
 */
export const MyListingsPage = () => {
  const { user, listings, apiReady } = useSafeStay();
  const [mine, setMine] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'owner') return;
    if (!isApiModeEnabled()) {
      setMine(listings.filter((l) => l.ownerName === user.email));
      return;
    }
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const res = await apiFetch('/api/listings/mine');
        if (!res.ok) {
          if (!cancelled) setError('Could not load your listings.');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setMine((data.listings || []).map(mapApiListingToCard).filter(Boolean));
        }
      } catch {
        if (!cancelled) setError('Network error loading your listings.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, listings, apiReady]);

  if (user?.role !== 'owner') {
    return (
      <div className="page">
        <h1>Property owners only</h1>
        <p>Sign in as a <strong>property owner</strong> to see the places you have listed.</p>
        <p>
          <Link to="/auth/register">Register as owner</Link> or <Link to="/auth/login">log in</Link>.
        </p>
      </div>
    );
  }

  if (isApiModeEnabled() && !apiReady) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page listings-page">
      <h1>My properties</h1>
      <p className="lede">Listings you have published on SafeStay. <Link to="/listings/new">Add a property</Link> · <Link to="/listings">Browse all</Link></p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="result-count" aria-live="polite">
        {mine.length} {mine.length === 1 ? 'property' : 'properties'}
      </p>
      <div className="listing-grid">
        {mine.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      {mine.length === 0 && !error && <p className="empty">You have not added any properties yet. <Link to="/listings/new">Create a listing</Link></p>}
    </div>
  );
};
