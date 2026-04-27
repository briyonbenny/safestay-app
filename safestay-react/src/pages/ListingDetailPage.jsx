import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { publicImageUrl } from '../api/safeStayApi.js';
import { validateRequired } from '../utils/validation.js';

/**
 * VIEW: Listing detail, report, owner delete, link to real chat (API) or mock flow.
 */
export const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, isFavourite, toggleFavourite, user, deleteListing } = useSafeStay();
  const listing = listings.find((l) => l.id === id);

  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!listing) {
    return (
      <div className="page">
        <h1>Not found</h1>
        <p>We do not have that property reference.</p>
        <Link to="/listings">Back to browse</Link>
      </div>
    );
  }

  const isOwner =
    user?.role === 'owner' &&
    (listing.ownerId
      ? user?.id && String(user.id) === String(listing.ownerId)
      : listing.ownerName === user?.email);

  const onReport = (e) => {
    e.preventDefault();
    setReportError('');
    const v = validateRequired(reportText, 'a short description');
    if (!v.ok) {
      setReportError(v.message);
      return;
    }
    setReportSuccess(true);
    setShowReport(false);
    setReportText('');
  };

  const onDelete = async () => {
    if (!isOwner) return;
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteListing(listing.id);
      navigate('/listings/mine');
    } catch (e) {
      setDeleteError(e && e.message ? e.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const chatTo =
    user && user.id && listing.id
      ? isOwner
        ? `/chat`
        : `/chat?listingId=${encodeURIComponent(listing.id)}`
      : '/auth/login';
  const chatState = { listingTitle: listing.title, listingId: listing.id };

  const hero = listing.images?.[0] ? publicImageUrl(listing.images[0]) : null;

  return (
    <div className="page detail-page">
      {hero ? (
        <div
          className="detail-hero"
          style={{
            minHeight: 200,
            background: `url(${hero}) center/cover no-repeat`,
            borderRadius: 12,
          }}
          aria-hidden
        />
      ) : (
        <div className={`detail-hero detail-hero--${listing.imageHint || 'room-1'}`} aria-hidden />
      )}
      <div className="detail-layout">
        <div>
          <h1>{listing.title}</h1>
          {listing.isVerified && (
            <p>
              <span className="badge badge--ok">Verified listing</span>
            </p>
          )}
          <p className="detail-loc">
            {listing.location} · {listing.propertyType}
          </p>
          <p className="detail-price">€{listing.price} per month</p>
          <p className="detail-desc">{listing.description}</p>
          <p className="detail-owner">
            Listed by: <strong>{listing.ownerName}</strong>
          </p>
        </div>
        <aside className="detail-aside">
          <div className="stack">
            {!user && (
              <Link to="/auth/login" className="button button--secondary" state={{ from: `/listings/${listing.id}` }}>
                Log in to message the owner
              </Link>
            )}
            {user && user.role === 'student' && !isOwner && (
              <Link to={chatTo} state={chatState} className="button button--secondary">
                Message the owner
              </Link>
            )}
            <button
              type="button"
              className={`button button--primary${isFavourite(listing.id) ? ' is-saved' : ''}`}
              onClick={() => toggleFavourite(listing.id)}
            >
              {isFavourite(listing.id) ? 'Remove from saved' : 'Save listing'}
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete listing'}
                </button>
                {deleteError && (
                  <p className="form-error" role="alert">
                    {deleteError}
                  </p>
                )}
              </>
            )}
            <button type="button" className="button button--ghost" onClick={() => setShowReport(true)}>
              Report this listing
            </button>
          </div>
          {reportSuccess && (
            <p className="success-banner" role="status">
              Thank you. Your report has been submitted. Our team will look into it and contact you if needed.
            </p>
          )}
        </aside>
      </div>

      {showReport && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rep-title">
          <div className="modal">
            <h2 id="rep-title">Report listing</h2>
            <p className="modal__hint">Give a short detail so the team can investigate.</p>
            <form onSubmit={onReport}>
              <label className="field">
                <span>Details</span>
                <textarea
                  rows="4"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  required
                />
              </label>
              {reportError && (
                <p className="form-error" role="alert">
                  {reportError}
                </p>
              )}
              <div className="modal__actions">
                <button type="button" className="button button--ghost" onClick={() => setShowReport(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button--primary">
                  Submit report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="back-row">
        <Link to="/listings">← Back to results</Link>
      </p>
    </div>
  );
};
