import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import {
  validateEmail,
  validatePassword,
  validatePasswordsMatch,
} from '../utils/validation.js';
import { apiFetch, isApiModeEnabled } from '../api/safeStayApi.js';

const PREFILL_NAME = 'Alex Student';
const PREFILL_EMAIL = 'new.user@university.ie';
const PREFILL_PASSWORD = 'Password1';

/**
 * VIEW: Registration. With VITE_USE_API, uses POST /api/auth/signup (real Mongo account).
 */
export const RegisterPage = () => {
  const { login, saveAccountRole, applyServerUser } = useSafeStay();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(PREFILL_NAME);
  const [email, setEmail] = useState(PREFILL_EMAIL);
  const [password, setPassword] = useState(PREFILL_PASSWORD);
  const [confirm, setConfirm] = useState(PREFILL_PASSWORD);
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const n = fullName?.trim() || '';
    if (isApiModeEnabled() && n.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

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
    const mRes = validatePasswordsMatch(password, confirm);
    if (!mRes.ok) {
      setError(mRes.message);
      return;
    }
    const roleValue = role === 'owner' ? 'owner' : 'student';

    if (isApiModeEnabled()) {
      try {
        const res = await apiFetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: n,
            email: eRes.value,
            password,
            role: roleValue,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || (data.errors && data.errors[0]) || 'Could not create account.');
          return;
        }
        if (data.user) {
          await applyServerUser(data.user);
          let meRes = await apiFetch('/api/auth/me');
          for (let attempt = 0; attempt < 5 && meRes.status === 401; attempt++) {
            await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
            meRes = await apiFetch('/api/auth/me');
          }
          if (!meRes.ok) {
            setError(
              'Account was created. Open Log in and sign in with your new email and password — if this keeps happening, use http://localhost:5173 and ensure VITE_API_BASE_URL matches in .env.development.'
            );
            navigate('/auth/login');
            return;
          }
        }
        navigate('/listings');
      } catch (err) {
        setError(err && err.message ? err.message : 'Sign up failed.');
      }
      return;
    }

    saveAccountRole(eRes.value, roleValue);
    login({ email: eRes.value, role: roleValue });
    navigate('/listings');
  };

  return (
    <div className="page form-page">
      <h1>Register</h1>
      <p className="form-page__intro">Create a profile, then browse listings or list your own property on SafeStay.</p>
      <form className="form-card" onSubmit={onSubmit} noValidate>
        {isApiModeEnabled() && (
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              minLength={2}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            aria-describedby={error ? 'reg-error' : undefined}
          />
        </label>
        <fieldset className="field field--row">
          <legend>I am a</legend>
          <label className="inline">
            <input
              type="radio"
              name="role"
              value="student"
              checked={role === 'student'}
              onChange={() => setRole('student')}
            />
            Student
          </label>
          <label className="inline">
            <input
              type="radio"
              name="role"
              value="owner"
              checked={role === 'owner'}
              onChange={() => setRole('owner')}
            />
            Property owner
          </label>
        </fieldset>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
          />
        </label>
        {error && (
          <p id="reg-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--primary">
          Create account
        </button>
      </form>
      <p className="form-page__foot">
        Have an account? <Link to="/auth/login">Log in</Link>
      </p>
    </div>
  );
};
