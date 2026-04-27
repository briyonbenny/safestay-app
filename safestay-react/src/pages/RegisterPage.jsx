import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import {
  validateEmail,
  validatePassword,
  validatePasswordsMatch,
} from '../utils/validation.js';

const PREFILL_EMAIL = 'new.user@university.ie';
const PREFILL_PASSWORD = 'Password1';

/**
 * VIEW: Registration. Picks account type: student (search/save) or property owner (add a property).
 */
export const RegisterPage = () => {
  const { login, saveAccountRole } = useSafeStay();
  const navigate = useNavigate();
  const [email, setEmail] = useState(PREFILL_EMAIL);
  const [password, setPassword] = useState(PREFILL_PASSWORD);
  const [confirm, setConfirm] = useState(PREFILL_PASSWORD);
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const onSubmit = (e) => {
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
    const mRes = validatePasswordsMatch(password, confirm);
    if (!mRes.ok) {
      setError(mRes.message);
      return;
    }
    const roleValue = role === 'owner' ? 'owner' : 'student';
    saveAccountRole(eRes.value, roleValue);
    login({ email: eRes.value, role: roleValue });
    navigate('/listings');
  };

  return (
    <div className="page form-page">
      <h1>Register</h1>
      <p className="form-page__intro">Create a profile, then browse listings or list your own property on SafeStay.</p>
      <form className="form-card" onSubmit={onSubmit} noValidate>
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
