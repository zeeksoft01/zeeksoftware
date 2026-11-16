export const affiliatePaths = {
  '/api/affiliates/register': {
    post: {
      tags: ['Affiliates'],
      summary: 'Register a new affiliate partner',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AffiliateRegisterInput' },
          },
        },
      },
      responses: {
        201: { description: 'Affiliate created with referral code and auth token' },
        409: { description: 'Email already registered' },
      },
    },
  },
  '/api/affiliates/login': {
    post: {
      tags: ['Affiliates'],
      summary: 'Authenticate an existing affiliate partner',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', example: 'adeyemi@example.com' },
                password: { type: 'string', example: 'SecretPass123' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Authenticated affiliate and Bearer token' },
        401: { description: 'Invalid credentials' },
      },
    },
  },
  '/api/affiliates/track-click': {
    post: {
      tags: ['Affiliates'],
      summary: 'Track a referral link visit (?ref=CODE)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['referralCode'],
              properties: {
                referralCode: { type: 'string', example: 'ZEEK84920' },
                targetPath: { type: 'string', example: '/' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Click recorded if referral code is valid and active' },
      },
    },
  },
  '/api/affiliates/me': {
    get: {
      tags: ['Affiliates'],
      summary: 'Get authenticated affiliate profile, commissions, withdrawals, and ledger',
      security: [{ AffiliateBearerAuth: [] }],
      responses: {
        200: { description: 'Affiliate dashboard data' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/affiliates/withdrawals': {
    post: {
      tags: ['Affiliates'],
      summary: 'Request a bank payout from available affiliate balance',
      security: [{ AffiliateBearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['amount'],
              properties: {
                amount: { type: 'number', example: 1000 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Withdrawal request created and funds reserved atomically' },
        400: { description: 'Insufficient balance or below minimum threshold' },
      },
    },
  },
};
