import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { getApiBase, isApiModeEnabled } from '../api/safeStayApi.js';

/** App chrome: header, nav, outlet. */
export const Layout = () => {
  const { user, logout, apiMode, apiReady } = useSafeStay();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `nav-link${isActive ? ' nav-link--active' : ''}`;

  const onNavigate = () => setMenuOpen(false);

  const prod = import.meta.env.PROD;
  const apiOn = isApiModeEnabled();
  const apiBase = String(getApiBase() || '').trim();
  const showDemoOnProd = prod && !apiOn;
  const showMissingApiUrl = prod && apiOn && !apiBase;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      {showDemoOnProd && (
        <div className="deploy-banner" role="status">
          <strong>Production demo:</strong> set <code>VITE_USE_API=true</code> and <code>VITE_API_BASE_URL</code> on the static build, redeploy.
        </div>
      )}
      {showMissingApiUrl && (
        <div className="deploy-banner deploy-banner--warn" role="alert">
          <strong>Missing API URL:</strong> add <code>VITE_API_BASE_URL</code> to the static site build env and redeploy.
        </div>
      )}
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="logo" onClick={onNavigate}>
            SafeStay
          </Link>
          {user?.role === 'owner' && (
            <Link
              to="/listings/new"
              className="button button--primary button--add-property"
              onClick={onNavigate}
            >
              Add property
            </Link>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menu
          </button>
          <nav
            id="main-nav"
            className={`main-nav${menuOpen ? ' main-nav--open' : ''}`}
            aria-label="Primary"
          >
            <NavLink to="/" end className={linkClass} onClick={onNavigate}>
              Home
            </NavLink>
            <NavLink to="/listings" className={linkClass} onClick={onNavigate}>
              Browse
            </NavLink>
            {user?.role === 'owner' && (
              <>
                <NavLink to="/listings/mine" className={linkClass} onClick={onNavigate}>
                  My properties
                </NavLink>
                <NavLink to="/listings/new" className={linkClass} onClick={onNavigate}>
                  Add property
                </NavLink>
              </>
            )}
            <NavLink to="/favourites" className={linkClass} onClick={onNavigate}>
              Saved
            </NavLink>
            <NavLink to="/chat" className={linkClass} onClick={onNavigate}>
              Chat
            </NavLink>
            {apiMode && !apiReady ? (
              <span className="user-chip" aria-live="polite">
                Checking session…
              </span>
            ) : user ? (
              <>
                <span className="user-chip" title="Signed in">
                  {user.email} · {user.role === 'owner' ? 'Host' : 'Student'}
                </span>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => {
                    logout();
                    onNavigate();
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/auth/login" className={linkClass} onClick={onNavigate}>
                  Log in
                </NavLink>
                <Link to="/auth/register" className="button button--accent" onClick={onNavigate}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>
          <strong>SafeStay</strong> — helping international students find vetted places to live.
        </p>
        <p className="footer-meta">Cork, Ireland</p>
      </footer>
    </div>
  );
};
