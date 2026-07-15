import logger from '#config/logger.js';
import { formatValidationError } from '#utils/format.js';
import { signUpSchema, signInSchema } from '#validation/auth.validation.js';
import { createUser, loginUser } from '#services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookie } from '#utils/cookies.js';
import { hashToken } from '#utils/crypto.js';
import {
  createRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeAllUserTokens,
  getActiveSessions,
  revokeSessionById,
} from '#services/refresh-token.service.js';

/**
 * POST /api/auth/sign-up
 * Register a new user, issue access + refresh tokens.
 */
export const signup = async (req, res, next) => {
  try {
    const validationResult = signUpSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { name, email, password } = validationResult.data;

    const user = await createUser({ name, email, password });

    // Generate access token (JWT, 15 min)
    const accessToken = jwttoken.sign({
      id: user.id,
      email: user.email,
    });

    // Generate refresh token (random, 7 days, stored hashed in DB)
    const refreshToken = await createRefreshToken(
      user.id,
      req.headers['user-agent'] || null,
      req.ip
    );

    // Set both cookies
    cookie.setAccessToken(res, accessToken);
    cookie.setRefreshToken(res, refreshToken);

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      message: 'User registered',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('Error during sign-up:', error);

    if (error.message === 'User with this email already exists') {
      return res
        .status(409)
        .json({ error: 'User with this email already exists' });
    }

    next(error);
  }
};

/**
 * POST /api/auth/sign-in
 * Authenticate user, issue access + refresh tokens.
 */
export const login = async (req, res, next) => {
  try {
    const validationResult = signInSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;

    const user = await loginUser(email, password);

    // Generate access token (JWT, 15 min)
    const accessToken = jwttoken.sign({
      id: user.id,
      email: user.email,
    });

    // Generate refresh token (random, 7 days, stored hashed in DB)
    const refreshToken = await createRefreshToken(
      user.id,
      req.headers['user-agent'] || null,
      req.ip
    );

    // Set both cookies
    cookie.setAccessToken(res, accessToken);
    cookie.setRefreshToken(res, refreshToken);

    logger.info(`User logged in successfully: ${email}`);

    res.status(200).json({
      message: 'User logged in',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    next(error);
  }
};

/**
 * POST /api/auth/sign-out
 * Revoke the current refresh token and clear all auth cookies.
 */
export const logout = async (req, res, next) => {
  try {
    // Read the refresh token from the cookie and revoke it in the DB
    const refreshTokenValue = req.cookies.refresh_token;
    if (refreshTokenValue) {
      const tokenHash = hashToken(refreshTokenValue);
      await revokeToken(tokenHash);
    }

    cookie.clearAuthCookies(res);
    logger.info('User logged out successfully');
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    logger.error('Error during logout:', error);
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Rotate the refresh token and issue a new access token.
 *
 * This is the most security-critical endpoint:
 * - If the token is valid → rotate it (revoke old, issue new)
 * - If the token was already used (reuse detected) → revoke ENTIRE family
 * - No JWT auth required — the refresh token cookie IS the credential
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshTokenValue = req.cookies.refresh_token;

    if (!refreshTokenValue) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No refresh token provided',
      });
    }

    const result = await rotateRefreshToken(
      refreshTokenValue,
      req.headers['user-agent'] || null,
      req.ip
    );

    // null means: not found, reuse detected, or expired
    if (!result) {
      cookie.clearAuthCookies(res);
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Refresh token is invalid, expired, or has been reused',
      });
    }

    const { newRawToken, user } = result;

    // Issue new access token
    const accessToken = jwttoken.sign({
      id: user.id,
      email: user.email,
    });

    // Set new cookies
    cookie.setAccessToken(res, accessToken);
    cookie.setRefreshToken(res, newRawToken);

    logger.info(`Tokens refreshed for user ${user.email}`);

    res.status(200).json({
      message: 'Tokens refreshed',
    });
  } catch (error) {
    logger.error('Error during token refresh:', error);
    next(error);
  }
};

/**
 * GET /api/auth/sessions
 * List all active sessions for the authenticated user.
 * Each session = one refresh token (with device info and IP).
 */
export const listSessions = async (req, res, next) => {
  try {
    const sessions = await getActiveSessions(req.user.id);

    res.status(200).json({
      sessions: sessions.map(s => ({
        id: s.id,
        device_info: s.device_info,
        ip_address: s.ip_address,
        created_at: s.created_at,
        expires_at: s.expires_at,
      })),
    });
  } catch (error) {
    logger.error('Error listing sessions:', error);
    next(error);
  }
};

/**
 * DELETE /api/auth/sessions/:id
 * Revoke a specific session (refresh token) by its ID.
 */
export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const revoked = await revokeSessionById(id, req.user.id);

    if (!revoked) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'No active session found with that ID',
      });
    }

    res.status(200).json({ message: 'Session revoked' });
  } catch (error) {
    logger.error('Error revoking session:', error);
    next(error);
  }
};

/**
 * DELETE /api/auth/sessions
 * Revoke ALL sessions for the authenticated user (logout everywhere).
 */
export const revokeAllSessions = async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user.id);
    cookie.clearAuthCookies(res);

    res.status(200).json({ message: 'All sessions revoked' });
  } catch (error) {
    logger.error('Error revoking all sessions:', error);
    next(error);
  }
};
