/**
 * Schémas de validation pour les opérations sur les universités.
 */

// 🔹 Propriétés communes d'une université publique
const universitePublicProperties = {
  id: { type: 'string' },
  profile_id: { type: 'string' },
  nom: { type: 'string' },
  sigle: { type: 'string' },
  annee_fondation: { type: 'integer' },
  description: { type: 'string' },
  contacts: { type: 'string' },
  email: { type: 'string' },
  nom_representant: { type: ['string', 'null'] },
  ville: { type: ['string', 'null'] },
  statut: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] },
  logo_url: { type: 'string' },
  couverture_logo_url: { type: 'string' },
  lien_site: { type: 'string' },
  primary_color: { type: ['string', 'null'] },
  domaine: { type: 'string' },
  video_url: { type: 'string' },
  date_creation: { type: 'string' },
  created_at: { type: 'string' },
  updated_at: { type: 'string' },
  domaines: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        nom: { type: 'string' },
        filieres: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nom: { type: 'string' },
              nom_affiche: { type: ['string', 'null'] },
              niveau: { type: ['string', 'null'] },
              niveau_detail: { type: ['string', 'null'] },
              duree: { type: ['string', 'null'] },
              lieu: { type: ['string', 'null'] },
              langue: { type: ['string', 'null'] },
              frais_inscription: { type: ['string', 'null'] },
              frais_l1: { type: ['string', 'null'] },
              frais_l2: { type: ['string', 'null'] },
              frais_l3: { type: ['string', 'null'] },
              frais_m1: { type: ['string', 'null'] },
              frais_m2: { type: ['string', 'null'] },
              frais_m3: { type: ['string', 'null'] },
              description: { type: ['string', 'null'] },
              prerequis: { type: ['string', 'null'] },
              alternance: { type: ['boolean', 'null'] }
            }
          }
        }
      }
    }
  },
};

export const getMyUniversiteSchema = {
  tags: ['Universités'],
  response: {
    200: {
      type: 'object',
      properties: universitePublicProperties,
      additionalProperties: false,
    },
  },
};

export const updateMyUniversiteSchema = {
  tags: ['Universités'],
  body: {
    type: 'object',
    properties: {
      nom: { type: 'string' },
      sigle: { type: 'string' },
      annee_fondation: { type: 'integer' },
      description: { type: 'string' },      contacts: { type: 'string' },      email: { type: 'string' },
      nom_representant: { type: ['string', 'null'] },
      ville: { type: ['string', 'null'] },
      logo_url: { type: 'string' },
      couverture_logo_url: { type: 'string' },
      lien_site: { type: 'string' },
      primary_color: { type: ['string', 'null'] },
      domaine: { type: 'string' },
      video_url: { type: 'string' },
      // Accept selectedFilieres if provided (for backward compatibility)
      selectedFilieres: { type: 'array', items: { type: 'string' } },
      formationDetails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filiere_id: { type: 'string' },
            filiereId: { type: 'string' },
            nom_affiche: { type: ['string', 'null'] },
            niveau: { type: ['string', 'null'] },
            niveau_detail: { type: ['string', 'null'] },
            duree: { type: ['string', 'null'] },
            lieu: { type: ['string', 'null'] },
            langue: { type: ['string', 'null'] },
            frais_inscription: { type: ['string', 'null'] },
            frais_l1: { type: ['string', 'null'] },
            frais_l2: { type: ['string', 'null'] },
            frais_l3: { type: ['string', 'null'] },
            frais_m1: { type: ['string', 'null'] },
            frais_m2: { type: ['string', 'null'] },
            frais_m3: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            prerequis: { type: ['string', 'null'] },
            alternance: { type: ['boolean', 'string', 'null'] }
          },
          additionalProperties: false,
        }
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: universitePublicProperties,
      additionalProperties: false,
    },
  },
};

export const getUniversiteByIdSchema = {
  tags: ['Universités'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: universitePublicProperties,
      additionalProperties: false,
    },
  },
};

export const listUniversitesSchema = {
  tags: ['Universités'],
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', default: 20 },
      offset: { type: 'integer', default: 0 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: universitePublicProperties,
        additionalProperties: false,
      },
    },
  },
};

export const attachFilieresSchema = {
  tags: ['Universités'],
  body: {
    type: 'object',
    properties: {
      // Accept both UUIDs and slugs (e.g., "genie-informatique")
      filiereIds: { type: 'array', items: { type: 'string' } },
      formationDetails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filiere_id: { type: 'string' },
            filiereId: { type: 'string' },
            nom_affiche: { type: ['string', 'null'] },
            niveau: { type: ['string', 'null'] },
            niveau_detail: { type: ['string', 'null'] },
            duree: { type: ['string', 'null'] },
            lieu: { type: ['string', 'null'] },
            langue: { type: ['string', 'null'] },
            frais_inscription: { type: ['string', 'null'] },
            frais_l1: { type: ['string', 'null'] },
            frais_l2: { type: ['string', 'null'] },
            frais_l3: { type: ['string', 'null'] },
            frais_m1: { type: ['string', 'null'] },
            frais_m2: { type: ['string', 'null'] },
            frais_m3: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            prerequis: { type: ['string', 'null'] },
            alternance: { type: ['boolean', 'string', 'null'] }
          },
          additionalProperties: false,
        }
      },
      formation_details: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filiere_id: { type: 'string' },
            filiereId: { type: 'string' },
            nom_affiche: { type: ['string', 'null'] },
            niveau: { type: ['string', 'null'] },
            niveau_detail: { type: ['string', 'null'] },
            duree: { type: ['string', 'null'] },
            lieu: { type: ['string', 'null'] },
            langue: { type: ['string', 'null'] },
            frais_inscription: { type: ['string', 'null'] },
            frais_l1: { type: ['string', 'null'] },
            frais_l2: { type: ['string', 'null'] },
            frais_l3: { type: ['string', 'null'] },
            frais_m1: { type: ['string', 'null'] },
            frais_m2: { type: ['string', 'null'] },
            frais_m3: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            prerequis: { type: ['string', 'null'] },
            alternance: { type: ['boolean', 'string', 'null'] }
          },
          additionalProperties: false,
        }
      },
      details: {
        type: 'object',
        properties: {
          filiere_id: { type: 'string' },
          filiereId: { type: 'string' },
          nom_affiche: { type: ['string', 'null'] },
          niveau: { type: ['string', 'null'] },
          niveau_detail: { type: ['string', 'null'] },
          duree: { type: ['string', 'null'] },
          lieu: { type: ['string', 'null'] },
          langue: { type: ['string', 'null'] },
          frais_inscription: { type: ['string', 'null'] },
          frais_l1: { type: ['string', 'null'] },
          frais_l2: { type: ['string', 'null'] },
          frais_l3: { type: ['string', 'null'] },
          frais_m1: { type: ['string', 'null'] },
          frais_m2: { type: ['string', 'null'] },
          frais_m3: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          prerequis: { type: ['string', 'null'] },
          alternance: { type: ['boolean', 'string', 'null'] }
        },
        additionalProperties: false,
      }
    },
    required: ['filiereIds'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            inserted: { type: 'integer' },
            updated: { type: 'integer' },
            skipped: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }
};
