// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const setupSwagger = (app: Express) => {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Event Analytics API',
        version: '1.0.0',
        description: 'API documentation for Event Analytics Platform',
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Local server',
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
      security: [
        {
          ApiKeyAuth: [],
        },
      ],
    },
    apis: ['./src/routes/*.ts'], // 
  };

  const specs = swaggerJsdoc(options);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
};
