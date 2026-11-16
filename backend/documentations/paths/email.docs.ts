export const emailPaths = {
  '/api/admin/email/provider-status': {
    get: {
      tags: ['Email & SMTP'],
      summary: 'Inspect configured Brevo API & SMTP transport status and optionally run a live verification handshake',
      security: [{ AdminBearerAuth: [] }],
      parameters: [
        {
          name: 'verify',
          in: 'query',
          required: false,
          schema: { type: 'boolean' },
          description: 'Pass verify=true to test Brevo REST API /senders and SMTP transporter.verify() live.',
        },
      ],
      responses: {
        200: { description: 'Non-secret email provider diagnostics & live verification result' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/admin/email/overview': {
    get: {
      tags: ['Email & SMTP'],
      summary: 'Fetch centralized email marketing KPIs, provider status, recent logs & Brevo events',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'Email overview payload' } },
    },
  },
  '/api/admin/email/test': {
    post: {
      tags: ['Email & SMTP'],
      summary: 'Send a branded diagnostic/test email via Brevo API v3 or SMTP fallback',
      security: [{ AdminBearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['to'],
              properties: {
                to: { type: 'string', format: 'email' },
                subject: { type: 'string' },
                bodyHtml: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Test email dispatched' } },
    },
  },
  '/api/admin/email/contacts': {
    get: {
      tags: ['Email & SMTP'],
      summary: 'List centralized email contacts across categories',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'Contact list and category counts' } },
    },
  },
  '/api/admin/email/campaigns': {
    get: {
      tags: ['Email & SMTP'],
      summary: 'List email marketing campaigns',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'Campaign list' } },
    },
  },
};
