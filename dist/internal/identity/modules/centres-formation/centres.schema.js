"use strict";
/**
 * Schémas de validation pour les opérations sur les centres de formation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCentresSchema = exports.getCentreByIdSchema = exports.updateMyCentreSchema = exports.getMyCentreSchema = void 0;
// 🔹 Propriétés publiques d’un centre
const centrePublicProperties = {
    id: { type: 'string' },
    profile_id: { type: 'string' },
    nom: { type: 'string' },
    description: { type: 'string' },
    email: { type: 'string' },
    nom_representant: { type: ['string', 'null'] },
    contacts: { type: 'string' },
    ville: { type: ['string', 'null'] },
    statut: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
    logo_url: { type: 'string' },
    couverture_logo_url: { type: 'string' },
    lien_site: { type: 'string' },
    primary_color: { type: ['string', 'null'] },
    video_url: { type: 'string' },
    date_creation: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    sigle: { type: 'string' },
    annee_fondation: { type: 'integer' },
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
                            nom: { type: 'string' }
                        }
                    }
                }
            }
        }
    },
};
exports.getMyCentreSchema = {
    tags: ['Centres'],
    response: {
        200: {
            type: 'object',
            properties: centrePublicProperties,
            additionalProperties: false,
        },
    },
};
exports.updateMyCentreSchema = {
    tags: ['Centres'],
    body: {
        type: 'object',
        properties: {
            nom: { type: 'string' },
            description: { type: 'string' },
            email: { type: 'string' },
            nom_representant: { type: ['string', 'null'] },
            contacts: { type: 'string' },
            ville: { type: ['string', 'null'] },
            logo_url: { type: 'string' },
            couverture_logo_url: { type: 'string' },
            lien_site: { type: 'string' },
            primary_color: { type: ['string', 'null'] },
            video_url: { type: 'string' },
            sigle: { type: 'string' },
            annee_fondation: { type: 'integer' },
            // 🔹 AJOUT IMPORTANT
            selectedFilieres: {
                type: 'array',
                items: {
                    type: 'string',
                    format: 'uuid'
                }
            }
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: centrePublicProperties,
            additionalProperties: false,
        },
    },
};
exports.getCentreByIdSchema = {
    tags: ['Centres'],
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: centrePublicProperties,
            additionalProperties: false,
        },
    },
};
exports.listCentresSchema = {
    tags: ['Centres'],
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
                properties: centrePublicProperties,
                additionalProperties: false,
            },
        },
    },
};
