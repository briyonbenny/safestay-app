import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { validatePrice, validateRequired } from '../utils/validation.js';

const TYPES = ['Room', 'Apartment', 'Studio', 'House'];

const PREFILL_TITLE = 'Sunny room near the university';
const PREFILL_LOCATION = 'Bishopstown, Cork';
const PREFILL_PRICE = '600';
const PREFILL_DESC =
  'Furnished single room in a quiet home. 15 minutes to campus by bus, shared living room and high-speed internet.';

/**
 * VIEW: New property. Preview updates as you type. addListing() adds to the shared list in this app.
 */
export const CreateListingPage = () => {
  const { user, addListing } = useSafeStay();
  const nav = useNavigate();
  const [title, setTitle] = useState(PREFILL_TITLE);
  const [location, setLocation] = useState(PREFILL_LOCATION);
  const [propertyType, setPropertyType] = useState('Room');
  const [price, setPrice] = useState(PREFILL_PRICE);
  const [description, setDescription] = useState(PREFILL_DESC);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  if (user?.role !== 'owner') {
    return (
      <div className="page form-page">
        <h1>Owner access</h1>
        <p>Sign in with a <strong>Property owner</strong> account to list a place. Register and choose that role, then come back here.</p>
        <p>
          <Link to="/auth/register">Register as owner</Link> or <Link to="/auth/login">log in</Link>.
        </p>
      </div>
    );
  }

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');

    const t = validateRequired(title, 'a title');
    if (!t.ok) {
      setError(t.message);
      return;
    }
    const l = validateRequired(location, 'a location');
    if (!l.ok) {
      setError(l.message);
      return;
    }
    const d = validateRequired(description, 'a description');
    if (!d.ok) {
      setError(d.message);
      return;
    }
    const p = validatePrice(price);
    if (!p.ok) {
      setError(p.message);
      return;
    }
    const created = addListing({
      title: t.value,
      location: l.value,
      propertyType,
      description: d.value,
      price: p.value,
    });
    nav(`/listings/${created.id}`);
  };

  return (
    <div className="page form-page create-page">
      <h1>Add a property</h1>
      <p className="form-page__intro">Fields below are pre-filled with an example. Edit and publish to add this listing to SafeStay.</p>
      <label className="inline toggle-preview">
        <input
          type="checkbox"
          checked={showPreview}
          onChange={() => setShowPreview((s) => !s)}
        />
        Show live preview
      </label>
      <div className="create-grid">
        <form className="form-card" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} name="title" />
          </label>
          <label className="field">
            <span>Location (area or city)</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} name="location" />
          </label>
          <label className="field">
            <span>Property type</span>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} name="propertyType">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Monthly rent (€)</span>
            <input
              name="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              rows="5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button button--primary">
            Publish listing
          </button>
        </form>
        {showPreview && (
          <aside className="preview-card" aria-live="polite">
            <h2>Preview</h2>
            <h3 className="preview-title">{title || 'Listing title'}</h3>
            <p className="preview-meta">
              {location || 'Location'} · {propertyType}
            </p>
            <p className="preview-price">
              {price ? `€${price}/mo` : 'Set a price (€/month)'}
            </p>
            <p className="preview-body">{description || 'Description will appear here.'}</p>
          </aside>
        )}
      </div>
    </div>
  );
};
