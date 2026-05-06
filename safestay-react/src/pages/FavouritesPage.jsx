import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { ListingCard } from '../components/ListingCard.jsx';

/**
 * VIEW: Saved / favourites (Assignment 3).
 * IDs persist in localStorage. Future: GET /api/favourites with auth.
 */
export const FavouritesPage = () => {
  const { listings, favouriteIds } = useSafeStay();
  const saved = useMemo(
    () => listings.filter((l) => favouriteIds.includes(l.id)),
    [listings, favouriteIds]
  );

  return (
    <div className="page">
      <h1>Saved listings</h1>
      <p className="lede">Your shortlist is saved in this browser so you can return to it later on this device.</p>
      {saved.length === 0 ? (
        <p>
          You have not saved any listings yet. <Link to="/listings">Browse and tap Save</Link>
        </p>
      ) : (
        <div className="listing-grid">
          {saved.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
};
