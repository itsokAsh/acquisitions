import express from 'express';
import {
  signup,
  login,
  logout,
  refresh,
  listSessions,
  revokeSession,
  revokeAllSessions,
} from '#controllers/auth.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/sign-up:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 example: securePassword123
 *     responses:
 *       201:
 *         description: User registered successfully. Sets access_token and refresh_token cookies.
 *       400:
 *         description: Validation failed
 *       409:
 *         description: User with this email already exists
 */
router.post('/sign-up', signup);

/**
 * @swagger
 * /api/auth/sign-in:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: Login successful. Sets access_token and refresh_token cookies.
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid email or password
 */
router.post('/sign-in', login);

/**
 * @swagger
 * /api/auth/sign-out:
 *   post:
 *     summary: Logout and revoke current refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully. Clears all auth cookies.
 */
router.post('/sign-out', logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate refresh token and get new access token
 *     tags: [Auth]
 *     description: |
 *       Uses the refresh_token cookie (not JWT) as the credential.
 *       On success, both cookies are replaced with new ones.
 *       If a previously used (rotated) token is sent, the entire
 *       token family is revoked (reuse detection).
 *     responses:
 *       200:
 *         description: Tokens refreshed. Sets new access_token and refresh_token cookies.
 *       401:
 *         description: Refresh token missing, invalid, expired, or reused
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: List active sessions for the current user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       device_info:
 *                         type: string
 *                       ip_address:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 */
router.get('/sessions', authenticateToken, listSessions);

/**
 * @swagger
 * /api/auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session (refresh token) ID
 *     responses:
 *       200:
 *         description: Session revoked
 *       404:
 *         description: Session not found
 *       401:
 *         description: Not authenticated
 */
router.delete('/sessions/:id', authenticateToken, revokeSession);

/**
 * @swagger
 * /api/auth/sessions:
 *   delete:
 *     summary: Revoke all sessions (logout everywhere)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked. Clears auth cookies.
 *       401:
 *         description: Not authenticated
 */
router.delete('/sessions', authenticateToken, revokeAllSessions);

export default router;
