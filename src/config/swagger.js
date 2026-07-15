import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NimbusAuth API',
      version: '1.0.0',
      description:
        'A production-grade authentication and authorization platform with JWT refresh token rotation, RBAC, and multi-tenancy.',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT access token stored in an httpOnly cookie',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
