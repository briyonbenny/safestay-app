/**
 * Client-side validation (Assignment 3).
 * Messages are user-facing. Server would repeat checks on POST /api/auth, etc.
 */

// Basic RFC-style check — suitable for form UX, not security proofing.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (value) => {
  const t = (value || '').trim();
  if (!t) return { ok: false, message: 'Please enter an email address.' };
  if (!EMAIL_RE.test(t)) return { ok: false, message: 'That email does not look valid.' };
  return { ok: true, value: t };
};

// Matches typical backend rule: min length, one letter and one number.
export const validatePassword = (value) => {
  const s = value || '';
  if (s.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[a-zA-Z]/.test(s) || !/[0-9]/.test(s)) {
    return {
      ok: false,
      message: 'Use at least one letter and one number in your password.',
    };
  }
  return { ok: true, value: s };
};

export const validateRequired = (value, fieldLabel) => {
  const t = (value || '').trim();
  if (!t) {
    return { ok: false, message: `Please enter ${fieldLabel || 'a value'}.` };
  }
  return { ok: true, value: t };
};

export const validatePrice = (value) => {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) {
    return { ok: false, message: 'Price must be a number greater than zero (€/month).' };
  }
  return { ok: true, value: n };
};

export const validatePasswordsMatch = (a, b) => {
  if (a !== b) return { ok: false, message: 'Passwords do not match.' };
  return { ok: true };
};
