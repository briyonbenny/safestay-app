/**
 * Intentional omission of fetch/axios in Assignment 3.
 * Future server integration (MERN) would use these shapes:
 * - POST /api/auth/login   { email, password } -> session / JWT
 * - GET  /api/listings     query: location, minPrice, maxPrice, type
 * - POST /api/listings     { title, location, price, propertyType, description }
 * - GET  /api/messages?listingId=…  -> chat thread
 * - POST /api/messages
 * - POST /api/reports
 * All data in this app is in-memory and localStorage for demonstration only.
 */

export const INTEGRATION_HINT = {
  listListings: 'GET /api/listings',
  createListing: 'POST /api/listings (owner role)',
  favourites: 'GET/POST /api/favourites',
  sendMessage: 'POST /api/messages or WebSocket',
  report: 'POST /api/reports',
};
