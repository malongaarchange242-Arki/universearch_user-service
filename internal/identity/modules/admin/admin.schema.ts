/**
 * Schémas de validation JSON pour les opérations d'administration.
 * Utilisés par Fastify pour valider les requêtes entrant.
 */

export const updateUniversiteStatusSchema = {
  description: 'Changer le statut d\'une université (PENDING, APPROVED, REJECTED)',
  tags: ['Admin'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID de l\'université',
      },
    },
  },
  body: {
    type: 'object',
    required: ['statut'],
    properties: {
      statut: {
        type: 'string',
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        description: 'Nouveau statut',
      },
      raison: {
        type: 'string',
        description: 'Raison du changement (optionnel)',
      },
    },
  },
  response: {
    200: {
      description: 'Statut mis à jour',
      type: 'object',
      properties: {
        id: { type: 'string' },
        nom: { type: 'string' },
        statut: { type: 'string' },
        updated_at: { type: 'string' },
      },
    },
  },
};

export const approveUniversiteSchema = {
  description: 'Approuver une université (ADMIN/SUPER_ADMIN seulement)',
  tags: ['Admin'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID de l\'université',
      },
    },
  },
  response: {
    200: {
      description: 'Université approuvée avec succès',
      type: 'object',
      properties: {
        id: { type: 'string' },
        nom: { type: 'string' },
        statut: { type: 'string', enum: ['APPROVED'] },
        updated_at: { type: 'string' },
      },
    },
    400: {
      description: 'Université non trouvée ou déjà approuvée',
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
};

export const rejectUniversiteSchema = {
  description: 'Rejeter une université (ADMIN/SUPER_ADMIN seulement)',
  tags: ['Admin'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID de l\'université',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      raison: {
        type: 'string',
        description: 'Raison du rejet (optionnel)',
      },
    },
  },
  response: {
    200: {
      description: 'Université rejetée avec succès',
      type: 'object',
      properties: {
        id: { type: 'string' },
        nom: { type: 'string' },
        statut: { type: 'string', enum: ['REJECTED'] },
        updated_at: { type: 'string' },
      },
    },
  },
};

export const listPendingUniversitesSchema = {
  description: 'Lister les universités en attente d\'approbation',
  tags: ['Admin'],
  querystring: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        default: 20,
        description: 'Nombre maximal de résultats',
      },
      offset: {
        type: 'integer',
        default: 0,
        description: 'Décalage pour pagination',
      },
    },
  },
  response: {
    200: {
      description: 'Liste des universités en attente',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nom: { type: 'string' },
          email: { type: 'string' },
          statut: { type: 'string' },
          date_creation: { type: 'string' },
        },
      },
    },
  },
};

export const updateCentreStatusSchema = {
  description: 'Changer le statut d\'un centre de formation (PENDING, APPROVED, REJECTED)',
  tags: ['Admin'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID du centre de formation',
      },
    },
  },
  body: {
    type: 'object',
    required: ['statut'],
    properties: {
      statut: {
        type: 'string',
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        description: 'Nouveau statut',
      },
      raison: {
        type: 'string',
        description: 'Raison du changement (optionnel)',
      },
    },
  },
  response: {
    200: {
      description: 'Statut mis à jour',
      type: 'object',
      properties: {
        id: { type: 'string' },
        nom: { type: 'string' },
        statut: { type: 'string' },
        updated_at: { type: 'string' },
      },
    },
  },
};

export const approveCentreSchema = {
  description: 'Approuver un centre de formation (ADMIN/SUPER_ADMIN seulement)',
  tags: ['Admin'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID du centre de formation',
      },
    },
  },
  response: {
    200: {
      description: 'Centre approuvé avec succès',
      type: 'object',
      properties: {
        id: { type: 'string' },
        nom: { type: 'string' },
        statut: { type: 'string', enum: ['APPROVED'] },
        updated_at: { type: 'string' },
      },
    },
  },
};

export const rejectCentreSchema = {
  description: 'Rejeter un centre de formation (ADMIN/SUPER_ADMIN seulement)',
  tags: ['Admin'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID du centre de formation',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      raison: {
        type: 'string',
        description: 'Raison du rejet (optionnel)',
      },
    },
  },
  response: {
    200: {
      description: 'Centre rejeté avec succès',
      type: 'object',
      properties: {
        id: { type: 'string' },
        nom: { type: 'string' },
        statut: { type: 'string', enum: ['REJECTED'] },
        updated_at: { type: 'string' },
      },
    },
  },
};

export const listPendingCentresSchema = {
  description: 'Lister les centres de formation en attente d\'approbation',
  tags: ['Admin'],
  querystring: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        default: 20,
        description: 'Nombre maximal de résultats',
      },
      offset: {
        type: 'integer',
        default: 0,
        description: 'Décalage pour pagination',
      },
    },
  },
  response: {
    200: {
      description: 'Liste des centres en attente',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nom: { type: 'string' },
          email: { type: 'string' },
          statut: { type: 'string' },
          date_creation: { type: 'string' },
        },
      },
    },
  },
};

export const dashboardStatsSchema = {
  description: 'Statistiques agrégées pour le dashboard admin',
  tags: ['Admin'],
  response: {
    200: {
      type: 'object',
      properties: {
        universites: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            approved: { type: 'integer' },
            pending: { type: 'integer' },
          },
        },
        centres: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            approved: { type: 'integer' },
            pending: { type: 'integer' },
          },
        },
        utilisateurs: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
          },
        },
      },
    },
  },
};

