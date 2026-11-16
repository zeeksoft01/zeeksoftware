export const storePaths = {
  '/api/bootstrap': {
    get: {
      tags: ['Storefront'],
      summary: 'Get storefront bootstrap payload',
      description: 'Loads active products, categories, hero slides, benefit cards, approved reviews, FAQs, policies, and site settings in one call.',
      responses: {
        200: { description: 'Bootstrap storefront dataset' },
      },
    },
  },
  '/api/products': {
    get: {
      tags: ['Storefront'],
      summary: 'List available products',
      parameters: [
        { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category name' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search keyword' },
      ],
      responses: {
        200: {
          description: 'List of available products',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/products/{id}': {
    get: {
      tags: ['Storefront'],
      summary: 'Get single product by ID',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'prod-canva-pro-1y' },
      ],
      responses: {
        200: { description: 'Product found' },
        404: { description: 'Product not found' },
      },
    },
  },
  '/api/contact': {
    post: {
      tags: ['Storefront'],
      summary: 'Submit customer contact inquiry',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fullName', 'email', 'subject', 'message'],
              properties: {
                fullName: { type: 'string', example: 'Adaeze Nwosu' },
                email: { type: 'string', format: 'email', example: 'adaeze@example.com' },
                whatsApp: { type: 'string', example: '08098765432' },
                subject: { type: 'string', example: 'Subscription Inquiry' },
                message: { type: 'string', example: 'Please confirm Canva Pro activation timeline.' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Inquiry recorded' },
        400: { description: 'Validation error' },
      },
    },
  },
  '/api/reviews': {
    post: {
      tags: ['Storefront'],
      summary: 'Submit customer review (pending admin approval)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['customerName', 'rating', 'reviewMessage'],
              properties: {
                customerName: { type: 'string', example: 'Tunde S.' },
                rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                reviewMessage: { type: 'string', example: 'Fast delivery and responsive WhatsApp team.' },
                productPurchased: { type: 'string', example: 'ChatGPT Plus' },
                orderId: { type: 'string', example: 'ZEEK-ORD-104928' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Review submitted for approval' },
        400: { description: 'Validation error' },
      },
    },
  },
};
