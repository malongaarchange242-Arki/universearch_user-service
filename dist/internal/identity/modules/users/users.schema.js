"use strict";
// src/modules/users/users.schema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersSchema = exports.updateUserSchema = exports.getUserSchema = void 0;
exports.getUserSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
};
exports.updateUserSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        properties: {
            nom: { type: 'string', minLength: 2, maxLength: 100 },
            prenom: { type: 'string', minLength: 2, maxLength: 100 },
            telephone: { type: 'string', minLength: 6, maxLength: 20 },
            dateNaissance: { type: 'string', format: 'date' },
            genre: { type: 'string', enum: ['homme', 'femme', 'autre'] },
            profileType: {
                type: 'string',
                enum: [
                    'utilisateur',
                    'admin',
                    'superviseur',
                    'universite',
                    'bde',
                    'centre_formation',
                ],
            },
        },
        additionalProperties: false,
    },
};
exports.listUsersSchema = {
    querystring: {
        type: 'object',
        properties: {
            profileType: {
                type: 'string',
                enum: [
                    'utilisateur',
                    'admin',
                    'superviseur',
                    'universite',
                    'bde',
                    'centre_formation',
                ],
            },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
    },
};
