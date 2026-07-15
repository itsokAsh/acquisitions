import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure random token.
 * Returns a 32-byte (256-bit) hex string.
 *
 * Used for refresh tokens, email verification tokens,
 * password reset tokens — anything that needs to be
 * unguessable.
 */
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a token using SHA-256.
 * Returns the hex-encoded hash.
 *
 * Why SHA-256 instead of bcrypt?
 * - Refresh tokens are 256-bit random strings (high entropy).
 * - They CANNOT be brute-forced, so slow hashing is unnecessary.
 * - bcrypt takes ~100ms per hash — too slow for every /refresh call.
 * - SHA-256 is instant and perfectly safe for high-entropy inputs.
 */
export const hashToken = token => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
