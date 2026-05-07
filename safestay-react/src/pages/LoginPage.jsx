import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { validateEmail, validatePassword } from '../utils/validation.js';
import { isApiModeEnabled } from '../api/safeStayApi.js';

// Sensible test values; clear or change before a production launch.
const PREFILL_EMAIL = 'student@university.ie';
const PREFILL_PASSWORD = 'Password1';

/** Login form; POST /api/auth/login when API mode is on. */
export const LoginPage = () => {
  const { login, getRoleForEmail } = useSafeStay();
  const navigate = useNavigate();
  const [email, setEmail] = useState(PREFILL_EMAIL);
  const [password, setPassword] = useState(PREFILL_PASSWORD);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const eRes = validateEmail(email);
    if (!eRes.ok) {
      setError(eRes.message);
      return;
    }
    const pRes = validatePassword(password);
    if (!pRes.ok) {
      setError(pRes.message);
      return;
    }

    if (isApiModeEnabled()) {
      try {
        await login({ email: eRes.value, _password: password });
        navigate('/listings');
      } catch (err) {
        setError(err && err.message ? err.message : 'Login failed.');
      }
      return;
    }

    const role = getRoleForEmail(eRes.value);
    login({ email: eRes.value, role });
    navigate('/listings');
  };

  return (
    <div className="page form-page">
      <h1>Log in</h1>
      <p className="form-page__intro">
        Enter the email and password for your account. If you are new, register and choose “Student” or
        “Property owner” first.
      </p>
      <form className="form-card" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
        </label>
        {error && (
          <p id="login-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--primary">
          Log in
        </button>
      </form>
      <p className="form-page__foot">
        No account? <Link to="/auth/register">Register</Link>
      </p>
    </div>
  );
};
