import express from 'express';
import { signup } from '#controllers/auth.controller.js';
import { login } from '#controllers/auth.controller.js';
import { logout } from '#controllers/auth.controller.js';

const router = express.Router();

router.post('/sign-up', signup);

router.post('/sign-in', login);

router.post('/sign-out', logout);

export default router;
