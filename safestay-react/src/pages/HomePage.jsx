import { Link } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { ListingCard } from '../components/ListingCard.jsx';

/**
 * VIEW: Home / landing. Featured uses the first few listings in the list.
 */
export const HomePage = () => {
  const { listings, user } = useSafeStay();
  const featured = listings.slice(0, 3);
  const isHost = user?.role === 'owner';

  return (
    <div className="page home-page">
      {isHost && (
        <div className="owner-banner" role="region" aria-label="List a property">
          <p>
            <strong>Hosts:</strong> add a room or apartment in a few minutes.
          </p>
          <Link to="/listings/new" className="button button--primary">
            Add property
          </Link>
        </div>
      )}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <h1 id="hero-title">Find a stay you can trust</h1>
          <p className="hero__lead">
            SafeStay helps international students discover vetted rooms and apartments, save favourites, and
            message owners — without the usual marketplace noise.
          </p>
          <div className="hero__actions">
            <Link to="/listings" className="button button--primary">
              Search listings
            </Link>
            <Link to="/auth/register" className="button button--secondary">
              Create an account
            </Link>
          </div>
        </div>
        <div className="hero__panel" role="status">
          <h2 className="hero__panel-title">Why students use SafeStay</h2>
          <ul className="hero__list">
            <li>Filter by area, price, and property type</li>
            <li>Save listings to compare later</li>
            <li>Report a listing that looks off before you pay a deposit</li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="featured-title">
        <h2 id="featured-title" className="section__title">
          Featured near Cork
        </h2>
        <div className="listing-grid">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
        <p className="section__more">
          <Link to="/listings">See all listings →</Link>
        </p>
      </section>
    </div>
  );
};
