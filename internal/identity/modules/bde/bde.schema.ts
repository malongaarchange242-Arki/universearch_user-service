import { FastifySchema } from 'fastify';

export const BdeSchemas = {

  createBde: {
    description: 'Create a new BDE for a university',
    tags: ['BDE'],
    body: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          nullable: true,
          maxLength: 1000,
        },
        logo_url: {
          type: 'string',
          nullable: true,
          format: 'uri',
        },
        video_url: {
          type: 'string',
          nullable: true,
          format: 'uri',
        },
        pres_lastname: {
          type: 'string',
          nullable: true,
          maxLength: 255,
        },
        pres_firstname: {
          type: 'string',
          nullable: true,
          maxLength: 255,
        },
        pres_phone: {
          type: 'string',
          nullable: true,
          maxLength: 20,
        },
        pres_email: {
          type: 'string',
          nullable: true,
          format: 'email',
        },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      401: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      403: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  } as FastifySchema,


  getBdeById: {
    description: 'Get BDE by ID',
    tags: ['BDE'],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  } as FastifySchema,


  getUniversiteBde: {
    description: 'Get BDE for a specific university',
    tags: ['BDE'],
    params: {
      type: 'object',
      required: ['universite_id'],
      properties: {
        universite_id: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  } as FastifySchema,


  updateBde: {
    description: 'Update BDE information',
    tags: ['BDE'],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
    body: {
      type: 'object',
      properties: {
        nom: { type: 'string', maxLength: 255 },
        description: { type: 'string', nullable: true, maxLength: 1000 },
        logo_url: { type: 'string', nullable: true, format: 'uri' },
        video_url: { type: 'string', nullable: true, format: 'uri' },
        pres_lastname: { type: 'string', nullable: true, maxLength: 255 },
        pres_firstname: { type: 'string', nullable: true, maxLength: 255 },
        pres_phone: { type: 'string', nullable: true, maxLength: 20 },
        pres_email: { type: 'string', nullable: true, format: 'email' },
        statut: { type: 'string', enum: ['actif', 'inactif', 'suspendu'] },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  } as FastifySchema,


  deleteBde: {
    description: 'Delete a BDE',
    tags: ['BDE'],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  } as FastifySchema,
};