// Client-side session helpers — plain TS module, no 'use client' needed
// Session is stored in both localStorage (client reads) and a cookie (middleware reads)
//
// DEMO ONLY — these credentials are intentionally public (displayed on the login page).
// Replace with a real auth provider before any production deployment.
const SESSION_KEY = 'evidenceiq-session';
const VALID_EMAIL = 'adjuster@evidenceiq.com';
const VALID_PASSWORD = 'demo1234';

/**
 * Attempt to log in with the given credentials.
 * Stores the session in localStorage and a cookie on success.
 * Returns true if credentials are valid, false otherwise.
 */
export function login(email: string, password: string): boolean {
  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    localStorage.setItem(SESSION_KEY, 'authenticated');
    // Also set a cookie so server-side middleware can read it.
    // NOTE: not HttpOnly (JS-set cookies cannot be) — XSS can steal this session;
    // acceptable for demo only. Secure is safe on localhost (browsers ignore it).
    document.cookie = `${SESSION_KEY}=authenticated; path=/; SameSite=Lax; Secure`;
    return true;
  }
  return false;
}

/**
 * Clear the session from both localStorage and the cookie.
 */
export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Lax; Secure`;
}

/**
 * Returns true if there is a valid session in localStorage.
 * Safe to call during SSR — returns false when window is not available.
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SESSION_KEY) === 'authenticated';
}
