export const paymentPaths = {
  '/api/paystack/initialize': {
    post: {
      tags: ['Payments'],
      summary: 'Initialize a Paystack transaction for an order',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['orderId'],
              properties: {
                orderId: { type: 'string', example: 'ZEEK-ORD-104928' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Authorization URL & payment reference generated' },
        404: { description: 'Order not found' },
      },
    },
  },
  '/api/paystack/verify/{reference}': {
    get: {
      tags: ['Payments'],
      summary: 'Verify a Paystack transaction by reference',
      parameters: [
        { name: 'reference', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Verification status and updated order' },
        404: { description: 'Reference not linked to an order' },
      },
    },
  },
  '/api/paystack/webhook': {
    post: {
      tags: ['Payments'],
      summary: 'Paystack webhook receiver (HMAC-SHA512 verified when PAYSTACK_SECRET_KEY is configured)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
      responses: {
        200: { description: 'Webhook processed' },
        401: { description: 'Invalid signature' },
      },
    },
  },
};
