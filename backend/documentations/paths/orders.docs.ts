export const orderPaths = {
  '/api/orders': {
    post: {
      tags: ['Orders'],
      summary: 'Create a new order with server-verified pricing',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateOrderInput' },
          },
        },
      },
      responses: {
        201: {
          description: 'Order created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  order: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid input' },
        404: { description: 'Product ID not found' },
      },
    },
  },
  '/api/orders/lookup': {
    post: {
      tags: ['Orders'],
      summary: 'Lookup customer orders by Order ID, email, WhatsApp, or payment reference',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['query'],
              properties: {
                query: { type: 'string', example: 'chinedu@example.com' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Matching orders' },
      },
    },
  },
  '/api/orders/{orderId}': {
    get: {
      tags: ['Orders'],
      summary: 'Get order details by Order ID or payment reference',
      parameters: [
        { name: 'orderId', in: 'path', required: true, schema: { type: 'string' }, example: 'ZEEK-ORD-104928' },
      ],
      responses: {
        200: { description: 'Order found' },
        404: { description: 'Order not found' },
      },
    },
  },
  '/api/orders/{orderId}/manual-payment': {
    post: {
      tags: ['Orders'],
      summary: 'Submit manual payment proof (Bank Transfer, USDT, Bybit, Binance)',
      parameters: [
        { name: 'orderId', in: 'path', required: true, schema: { type: 'string' }, example: 'ZEEK-ORD-104928' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                paymentMethod: {
                  type: 'string',
                  enum: ['Direct Bank Transfer', 'USDT', 'Bybit', 'Binance'],
                  example: 'Direct Bank Transfer',
                },
                transactionReference: { type: 'string', example: '000013284918239' },
                transactionHash: { type: 'string' },
                proofNote: { type: 'string', example: 'Sent from Sterling Bank' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Manual payment submitted for verification + WhatsApp notification link' },
        404: { description: 'Order not found' },
      },
    },
  },
};
