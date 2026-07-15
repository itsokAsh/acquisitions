import crypto from 'node:crypto';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { db } from '#config/database.js';
import { refreshTokens } from '#models/refresh-token.model.js';
import { users } from '#models/user.model.js';
import { generateToken, hashToken } from '#utils/crypto.js';
import logger from '#config/logger.js';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Create a new refresh token for a user.
 * This starts a NEW token family (used for reuse detection).
 *
 * Called on: signup, login
 */
export const createRefreshToken = async (userId, deviceInfo = null, ipAddress = null) => {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    user_id: userId,
    token_hash: tokenHash,
    family_id: familyId,
    device_info: deviceInfo,
    ip_address: ipAddress,
    expires_at: expiresAt,
  });

  logger.info(`Refresh token created for user ${userId}, family ${familyId}`);
  return rawToken;
};

/**
 * Rotate a refresh token.
 *
 * This is the core security mechanism:
 * 1. Hash the incoming token and look it up
 * 2. If not found → reject
 * 3. If found but REVOKED → REUSE DETECTED → revoke entire family
 * 4. If found but expired → reject
 * 5. If valid → revoke the old token, create new one with SAME family_id
 *
 * The family_id is the key insight: if an attacker steals a token
 * and uses it AFTER the legitimate user has rotated it, the old token
 * will be found with revoked_at set. That triggers family-wide revocation,
 * killing the attacker's stolen token too.
 */
export const rotateRefreshToken = async (rawToken, deviceInfo = null, ipAddress = null) => {
  const tokenHash = hashToken(rawToken);

  // Step 1: Look up token by hash
  const [existingToken] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token_hash, tokenHash))
    .limit(1);

  if (!existingToken) {
    logger.warn('Refresh token not found — possible theft attempt');
    return null;
  }

  // Step 2: REUSE DETECTION — token was already revoked
  if (existingToken.revoked_at !== null) {
    logger.error(
      `SECURITY: Refresh token reuse detected! Family ${existingToken.family_id}, user ${existingToken.user_id}`
    );
    // Revoke the ENTIRE family — kill all tokens from this login session
    await revokeTokenFamily(existingToken.family_id);
    return null;
  }

  // Step 3: Check expiration
  if (new Date(existingToken.expires_at) < new Date()) {
    logger.warn(`Refresh token expired for user ${existingToken.user_id}`);
    // Revoke it so it's marked as used
    await revokeToken(tokenHash);
    return null;
  }

  // Step 4: Token is valid — rotate it
  // Revoke the current token
  await revokeToken(tokenHash);

  // Create a new token with the SAME family_id
  const newRawToken = generateToken();
  const newTokenHash = hashToken(newRawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    user_id: existingToken.user_id,
    token_hash: newTokenHash,
    family_id: existingToken.family_id, // SAME family
    device_info: deviceInfo,
    ip_address: ipAddress,
    expires_at: expiresAt,
  });

  // Fetch the user for generating a new access token
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, existingToken.user_id))
    .limit(1);

  if (!user) {
    logger.error(`User ${existingToken.user_id} not found during token rotation`);
    return null;
  }

  logger.info(`Refresh token rotated for user ${user.id}, family ${existingToken.family_id}`);
  return { newRawToken, user };
};

/**
 * Revoke all tokens in a family.
 * Called when reuse is detected — nukes the entire session lineage.
 */
export const revokeTokenFamily = async familyId => {
  await db
    .update(refreshTokens)
    .set({ revoked_at: new Date() })
    .where(and(eq(refreshTokens.family_id, familyId), isNull(refreshTokens.revoked_at)));

  logger.info(`All tokens in family ${familyId} revoked`);
};

/**
 * Revoke a single token by its hash.
 * Called on: logout, token rotation
 */
export const revokeToken = async tokenHash => {
  await db
    .update(refreshTokens)
    .set({ revoked_at: new Date() })
    .where(eq(refreshTokens.token_hash, tokenHash));
};

/**
 * Revoke ALL tokens for a user.
 * Called on: "logout everywhere" / password change
 */
export const revokeAllUserTokens = async userId => {
  await db
    .update(refreshTokens)
    .set({ revoked_at: new Date() })
    .where(and(eq(refreshTokens.user_id, userId), isNull(refreshTokens.revoked_at)));

  logger.info(`All refresh tokens revoked for user ${userId}`);
};

/**
 * Get all active (non-revoked, non-expired) sessions for a user.
 * Each refresh token = one session.
 * Used for the "Active Sessions" UI.
 */
export const getActiveSessions = async userId => {
  const sessions = await db
    .select({
      id: refreshTokens.id,
      device_info: refreshTokens.device_info,
      ip_address: refreshTokens.ip_address,
      created_at: refreshTokens.created_at,
      expires_at: refreshTokens.expires_at,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.user_id, userId),
        isNull(refreshTokens.revoked_at)
      )
    );

  // Filter out expired ones in application code
  const now = new Date();
  return sessions.filter(s => new Date(s.expires_at) > now);
};

/**
 * Revoke a specific session (refresh token) by its ID.
 * The user can only revoke their own sessions.
 */
export const revokeSessionById = async (sessionId, userId) => {
  const result = await db
    .update(refreshTokens)
    .set({ revoked_at: new Date() })
    .where(
      and(
        eq(refreshTokens.id, sessionId),
        eq(refreshTokens.user_id, userId),
        isNull(refreshTokens.revoked_at)
      )
    )
    .returning({ id: refreshTokens.id });

  return result.length > 0;
};

/**
 * Housekeeping: delete tokens that expired more than 7 days ago.
 * Call this periodically (e.g., daily cron) to keep the table clean.
 */
export const cleanupExpiredTokens = async () => {
  const cutoff = new Date(Date.now() - REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expires_at, cutoff))
    .returning({ id: refreshTokens.id });

  logger.info(`Cleaned up ${deleted.length} expired refresh tokens`);
  return deleted.length;
};
