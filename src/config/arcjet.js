import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';
import dotenv from 'dotenv';

dotenv.config();

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN' }),
    // Create a bot detection rule
    detectBot({
      mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN', // Only block in production
      // Block all bots except the following
      allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
    }),

    slidingWindow({
      mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
      interval: '2s',
      max: 5,
    }),
  ],
});

export default aj;
