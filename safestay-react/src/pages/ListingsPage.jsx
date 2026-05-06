import { useMemo, useState } from 'react';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { ListingCard } from '../components/ListingCard.jsx';

const PROPERTY_TYPES = ['Any', 'Room', 'Apartment', 'Studio', 'House'];

/**
 * VIEW: Browse and filter (Assignment 3).
 * Dynamic filtering updates the grid; matches client-side search and filter from the proposal.
 * Future: debounced request to GET /api/listings with query params.
 */
export const ListingsPage = () => {
  const { listings } = useSafeStay();
  const [q, setQ] = useState('');
  const [type, setType] = useState('Any');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const { filterError, filtered } = useMemo(() => {
    let minN = null;
    let maxN = null;
    if (minPrice) {
      minN = Number(minPrice);
      if (Number.isNaN(minN) || minN < 0) {
        return { filterError: 'Minimum price must be a number ≥ 0.', filtered: listings };
      }
    }
    if (maxPrice) {
      maxN = Number(maxPrice);
      if (Number.isNaN(maxN) || maxN < 0) {
        return { filterError: 'Maximum price must be a number ≥ 0.', filtered: listings };
      }
    }
    if (minN != null && maxN != null && minN > maxN) {
      return {
        filterError: 'Minimum price cannot be greater than maximum price.',
        filtered: listings,
      };
    }
    const qq = q.trim().toLowerCase();
    const out = listings.filter((l) => {
      if (type !== 'Any' && l.propertyType !== type) return false;
      if (qq) {
        const joined = `${l.title} ${l.location} ${l.description}`.toLowerCase();
        if (!joined.includes(qq)) return false;
      }
      if (minN != null && l.price < minN) return false;
      if (maxN != null && l.price > maxN) return false;
      return true;
    });
    return { filterError: '', filtered: out };
  }, [listings, q, type, minPrice, maxPrice]);

  return (
    <div className="page listings-page">
      <h1>Browse listings</h1>
      <p className="lede">Search by keyword, type, and monthly price. Results update as you type.</p>

      <form
        className="filter-bar"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Filter listings"
      >
        <label className="field field--inline">
          <span>Search</span>
          <input
            type="search"
            name="q"
            placeholder="e.g. UCC, Bishopstown…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="field field--inline">
          <span>Type</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t === 'Any' ? 'Any' : t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline">
          <span>Min €/mo</span>
          <input
            type="text"
            inputMode="numeric"
            name="min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
          />
        </label>
        <label className="field field--inline">
          <span>Max €/mo</span>
          <input
            type="text"
            inputMode="numeric"
            name="max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Any"
          />
        </label>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => {
            setQ('');
            setType('Any');
            setMinPrice('');
            setMaxPrice('');
          }}
        >
          Reset
        </button>
      </form>
      {filterError && (
        <p className="form-error" role="status">
          {filterError}
        </p>
      )}

      <p className="result-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'place' : 'places'} found
      </p>
      <div className="listing-grid">
        {filtered.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      {filtered.length === 0 && <p className="empty">No matches — try another keyword or price range.</p>}
    </div>
  );
};
