export const adminPaths = {
  '/api/admin/login': {
    post: {
      tags: ['Admin'],
      summary: 'Authenticate into Admin Dashboard',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password'],
              properties: {
                password: { type: 'string', example: 'zeekadmin2026' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Authenticated successfully; returns Bearer token' },
        401: { description: 'Invalid admin credentials' },
      },
    },
  },
  '/api/admin/dashboard': {
    get: {
      tags: ['Admin'],
      summary: 'Fetch admin dashboard metrics, recent orders, inquiries, and audit logs',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'Dashboard summary' } },
    },
  },
  '/api/admin/orders': {
    get: {
      tags: ['Admin'],
      summary: 'List all orders (optionally filtered by status)',
      security: [{ AdminBearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by paymentStatus or fulfillmentStatus' },
      ],
      responses: { 200: { description: 'List of orders' } },
    },
  },
  '/api/admin/orders/{orderId}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update order payment verification or fulfillment status',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                paymentStatus: { type: 'string', enum: ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'] },
                fulfillmentStatus: { type: 'string', example: 'Activation Completed' },
                fulfillmentNotes: { type: 'string' },
                activationCredentials: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Order updated' }, 404: { description: 'Order not found' } },
    },
  },
  '/api/admin/products': {
    post: {
      tags: ['Admin'],
      summary: 'Create a new product',
      security: [{ AdminBearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductInput' } } },
      },
      responses: { 201: { description: 'Product created' } },
    },
  },
  '/api/admin/products/{id}': {
    put: {
      tags: ['Admin'],
      summary: 'Update an existing product',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductInput' } } },
      },
      responses: { 200: { description: 'Product updated' }, 404: { description: 'Product not found' } },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete a product',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Product deleted' }, 404: { description: 'Product not found' } },
    },
  },
  '/api/admin/settings': {
    put: {
      tags: ['Admin'],
      summary: 'Update site settings, brand identity logos, bank details, or slider config',
      security: [{ AdminBearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: 'Settings updated' } },
    },
  },
  '/api/admin/cms/{section}': {
    put: {
      tags: ['Admin'],
      summary: 'Update CMS section (slides, benefits, faqs, policies)',
      security: [{ AdminBearerAuth: [] }],
      parameters: [
        {
          name: 'section',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['slides', 'benefits', 'faqs', 'policies'] },
        },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: 'CMS section updated' } },
    },
  },
  '/api/admin/cms/reset-slides': {
    post: {
      tags: ['Admin'],
      summary: 'Restore the 4 default luxury hero slides',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'Hero slides reset' } },
    },
  },
  '/api/admin/reviews': {
    get: {
      tags: ['Admin'],
      summary: 'Get all customer reviews (including pending approval)',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'All reviews' } },
    },
  },
  '/api/admin/reviews/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Approve, feature, or edit a review',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                isApproved: { type: 'boolean' },
                isFeatured: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Review updated' } },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete a customer review',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Review deleted' } },
    },
  },
  '/api/admin/inquiries': {
    get: {
      tags: ['Admin'],
      summary: 'Get all contact inquiries',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'List of inquiries' } },
    },
  },
  '/api/admin/inquiries/{id}/read': {
    patch: {
      tags: ['Admin'],
      summary: 'Mark an inquiry as read',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Marked as read' } },
    },
  },
  '/api/admin/audit-logs': {
    get: {
      tags: ['Admin'],
      summary: 'Fetch system audit logs',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'Audit logs' } },
    },
  },
  '/api/admin/products/{id}/image': {
    post: {
      tags: ['Admin'],
      summary: 'Upload or replace product image via Cloudinary and save to MongoDB',
      security: [{ AdminBearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['imageBase64'],
              properties: {
                imageBase64: { type: 'string' },
                fileName: { type: 'string', example: 'product-cover' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Product image uploaded to Cloudinary and product updated in MongoDB' } },
    },
  },
  '/api/admin/upload-image': {
    post: {
      tags: ['Admin'],
      summary: 'Upload base64 image to Cloudinary',
      security: [{ AdminBearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['imageBase64'],
              properties: {
                imageBase64: { type: 'string' },
                fileName: { type: 'string', example: 'logo' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Image uploaded to Cloudinary and secure HTTPS URL returned' } },
    },
  },
  '/api/admin/affiliates': {
    get: {
      tags: ['Admin'],
      summary: 'List all registered affiliates',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'List of affiliates' } },
    },
  },
  '/api/admin/affiliates/{affiliateId}/adjust-balance': {
    post: {
      tags: ['Admin'],
      summary: 'Credit or debit an affiliate wallet balance',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'affiliateId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['type', 'amount', 'reason'],
              properties: {
                type: { type: 'string', enum: ['credit', 'debit'] },
                amount: { type: 'number', example: 500 },
                reason: { type: 'string', example: 'Promotional bonus' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Balance adjusted' } },
    },
  },
  '/api/admin/withdrawals': {
    get: {
      tags: ['Admin'],
      summary: 'List all affiliate withdrawal requests',
      security: [{ AdminBearerAuth: [] }],
      responses: { 200: { description: 'List of withdrawals' } },
    },
  },
  '/api/admin/withdrawals/{withdrawalId}': {
    patch: {
      tags: ['Admin'],
      summary: 'Approve, mark paid, or decline an affiliate withdrawal',
      security: [{ AdminBearerAuth: [] }],
      parameters: [{ name: 'withdrawalId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['Pending Review', 'Approved', 'Processing Payment', 'Payment Sent', 'Withdrawal Successful', 'Declined'],
                },
                transferReference: { type: 'string' },
                rejectionReason: { type: 'string' },
                adminNotes: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Withdrawal status updated' } },
    },
  },
};
