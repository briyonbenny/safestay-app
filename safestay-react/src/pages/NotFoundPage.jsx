import { Link } from 'react-router-dom';

/** Simple 404 for client-side routes when deployed with SPA rewrites. */
export const NotFoundPage = () => (
  <div className="page form-page">
    <h1>Page not found</h1>
    <p>That path is not in this app.</p>
    <p>
      <Link to="/">Back to home</Link>
    </p>
  </div>
);
