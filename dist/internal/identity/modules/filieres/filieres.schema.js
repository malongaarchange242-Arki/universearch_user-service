"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainesWithFilieresSchema = exports.listFilieresSchema = void 0;
exports.listFilieresSchema = {
    tags: ['Filières'],
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    nom: { type: 'string' },
                    domaine_id: { type: 'string', format: 'uuid' }
                },
                additionalProperties: false
            }
        }
    }
};
exports.domainesWithFilieresSchema = {
    tags: ['Domaines'],
    response: {
        200: {
            type: 'object',
            additionalProperties: {
                type: 'array',
                items: { type: 'string' }
            }
        }
    }
};
