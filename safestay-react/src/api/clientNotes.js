/**
 * Reference routes for a future wired client (not used at runtime here).
 */
export const INTEGRATION_HINT = {
  listListings: 'GET /api/listings',
  createListing: 'POST /api/listings (owner role)',
  favourites: 'GET/POST /api/favourites',
  sendMessage: 'POST /api/messages or WebSocket',
  report: 'POST /api/reports',
};
