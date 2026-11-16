export const healthPaths = {
  '/api/health': {
    get: {
      tags: ['Health'],
      summary: 'Check API & MongoDB connection health',
      description: 'Verifies Express server status, Mongoose connection readyState, database name, and MongoDB ping latency.',
      responses: {
        200: {
          description: 'API and storage status report',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  database: { type: 'string', example: 'connected' },
                  type: { type: 'string', example: 'mongodb' },
                  orm: { type: 'string', example: 'mongoose' },
                  latencyMs: { type: 'number', example: 3 },
                  databaseName: { type: 'string', example: 'zeek_softwares' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        503: { description: 'MongoDB ping failed' },
      },
    },
  },
};
