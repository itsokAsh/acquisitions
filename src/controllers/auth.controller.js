import logger from '../config/logger.js';
import { formatValidationError } from '../utils/format.js';
import { signUpSchema, signInSchema } from '../validation/auth.validation.js';
import { createUser, loginUser } from '../services/auth.service.js';
import { jwttoken } from '../utils/jwt.js';
import { cookie } from '../utils/cookies.js';

export const signup = async (req, res, next) => {
  try {
    const validationResult = signUpSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({
          error: 'Validation failed',
          details: formatValidationError(validationResult.error),
        });
    }

    const { name, email, password, role } = validationResult.data;

    const user = await createUser({ name, email, password, role });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    cookie.set(res, 'token', token);

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      message: 'User registered',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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

export const login = async (req, res, next) => {
  try {
    const validationResult = signInSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({
          error: 'Validation failed',
          details: formatValidationError(validationResult.error),
        });
    }

    const { email, password } = validationResult.data;

    const user = await loginUser(email, password);

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    cookie.set(res, 'token', token);

    logger.info(`User logged in successfully: ${email}`);

    res.status(200).json({
      message: 'User logged in',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    cookie.clear(res, 'token');
    logger.info('User logged out successfully');
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    logger.error('Error during logout:', error);
    next(error);
  }
};
