import jwt from 'jsonwebtoken';
import logger from '#config/logger.js';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing.');
}
const JWT_SECRET = process.env.JWT_SECRET;


const JWT_EXPIRATION = '15m';

export const jwttoken = {
  sign: payload => {
    try {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    } catch (e) {
      logger.error('Error signing JWT token', { error: e });
      throw new Error('Failed to authenticate user', { cause: e });
    }
  },
  verify: token => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      logger.error('Error verifying JWT token', { error: e });
      throw new Error('Failed to authenticate user', { cause: e });
    }
  },
};
