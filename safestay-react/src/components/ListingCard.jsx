import { Link } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';

/* Card for grid lists — save toggles a local shortlist. */
export const ListingCard = ({ listing, showFavourite = true }) => {
  const { isFavourite, toggleFavourite } = useSafeStay();
  const fav = isFavourite(listing.id);

  return (
    <article className="listing-card">
      <div className={`listing-card__image listing-card__image--${listing.imageHint}`} aria-hidden />
      <div className="listing-card__body">
        <h3 className="listing-card__title">
          <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
        </h3>
        <p className="listing-card__meta">
          {listing.location} · {listing.propertyType}
        </p>
        {listing.isVerified && (
          <p className="listing-card__badge">
            <span className="badge badge--ok">Verified</span>
          </p>
        )}
        <p className="listing-card__price">€{listing.price}/mo</p>
        {showFavourite && (
          <div className="listing-card__actions">
            <button
              type="button"
              className={`fav-button${fav ? ' fav-button--on' : ''}`}
              onClick={() => toggleFavourite(listing.id)}
              aria-pressed={fav}
            >
              {fav ? '★ Saved' : '☆ Save'}
            </button>
            <Link to={`/listings/${listing.id}`} className="button button--primary button--small">
              View
            </Link>
          </div>
        )}
      </div>
    </article>
  );
};
