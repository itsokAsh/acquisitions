/**
 * Cookie utilities for authentication.
 *
 * Two separate cookies:
 * - access_token: JWT, 15 min, sent on every request (path: /)
 * - refresh_token: raw token, 7 days, sent ONLY to /api/auth/refresh
 *
 * The path restriction on refresh_token is critical:
 * it prevents the browser from sending the refresh token
 * on every API call, minimizing the attack surface.
 */

const isProduction = () => process.env.NODE_ENV === 'production';

const baseOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'strict',
});

export const cookie = {
  /**
   * Set the short-lived JWT access token cookie.
   * maxAge: 15 minutes, path: / (sent on all requests)
   */
  setAccessToken: (res, token) => {
    res.cookie('access_token', token, {
      ...baseOptions(),
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
  },

  /**
   * Set the long-lived refresh token cookie.
   * maxAge: 7 days, path: /api/auth/refresh (sent ONLY on refresh requests)
   */
  setRefreshToken: (res, token) => {
    res.cookie('refresh_token', token, {
      ...baseOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });
  },

  /**
   * Clear both auth cookies.
   * Must specify the same path used when setting, or the browser won't clear them.
   */
  clearAuthCookies: res => {
    res.clearCookie('access_token', { ...baseOptions(), path: '/' });
    res.clearCookie('refresh_token', { ...baseOptions(), path: '/api/auth/refresh' });
  },

  /**
   * Generic getter (kept for backwards compatibility).
   */
  get: (req, name) => {
    return req.cookies[name];
  },
};
