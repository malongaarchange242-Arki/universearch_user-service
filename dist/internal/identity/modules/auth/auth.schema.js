"use strict";
/**
 * Auth schemas
 * src/modules/auth/auth.schema.ts
 *
 * Définit les schémas de validation pour l'authentification.
 * Aucun traitement métier ici.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.updateSecuritySchema = exports.checkEmailSchema = exports.logoutSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
exports.registerSchema = {
    body: {
        type: 'object',
        required: [
            'email',
            'nom',
            'telephone',
            'profileType'
        ],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                description: 'Adresse email de l\'utilisateur'
            },
            password: {
                type: 'string',
                minLength: 8,
                description: 'Mot de passe utilisateur (optionnel, un mot de passe généré aléatoirement sera utilisé si absent)'
            },
            nom: {
                type: 'string',
                minLength: 2,
                maxLength: 100
            },
            prenom: {
                type: 'string',
                nullable: true,
                minLength: 2,
                maxLength: 100,
                description: 'Optionnel - requis pour utilisateur, null pour organisations'
            },
            telephone: {
                type: 'string',
                minLength: 6,
                maxLength: 20
            },
            profileType: {
                type: 'string',
                enum: [
                    'utilisateur',
                    'admin',
                    'superviseur',
                    'universite',
                    'bde',
                    'centre_formation'
                ]
            },
            userType: {
                type: 'string',
                description: 'Obligatoire si profileType = utilisateur. Valeurs autorisées: bachelier, etudiant, parent. Autres valeurs seront normalisées vers parent.'
            },
            dateNaissance: {
                type: 'string',
                format: 'date'
            },
            genre: {
                type: 'string',
                enum: ['homme', 'femme', 'autre']
            },
            quartier: {
                type: 'string',
                minLength: 2,
                maxLength: 100,
                description: 'Quartier de l’utilisateur'
            },
            nom_representant: {
                type: 'string',
                minLength: 2,
                maxLength: 100,
                description: 'Nom du gestionnaire représentant l’établissement'
            }
        },
        allOf: [
            {
                if: {
                    properties: { profileType: { const: 'utilisateur' } }
                },
                then: {
                    required: ['userType', 'quartier']
                }
            }
        ]
    }
};
exports.loginSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                description: 'User email'
            },
            password: {
                type: 'string',
                minLength: 8,
                description: 'Password login for admin, universite and centre_formation'
            },
            telephone: {
                type: 'string',
                description: 'User phone number'
            }
        },
        anyOf: [
            { required: ['password'] },
            { required: ['telephone'] }
        ]
    }
};
exports.refreshSchema = {
    body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
            refresh_token: {
                type: 'string',
                minLength: 1,
                description: 'Refresh token JWT',
            },
        },
    },
};
exports.logoutSchema = {
    body: {
        type: 'object',
        properties: {
            refresh_token: {
                type: 'string',
                minLength: 1,
                description: 'Refresh token to revoke',
            },
        },
    },
};
exports.checkEmailSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: { type: 'string', format: 'email' }
        }
    }
};
exports.updateSecuritySchema = {
    body: {
        type: 'object',
        required: ['current_password'],
        properties: {
            current_password: {
                type: 'string',
                minLength: 1,
                description: 'Mot de passe actuel pour vérification'
            },
            new_password: {
                type: 'string',
                minLength: 8,
                description: 'Nouveau mot de passe (optionnel)'
            },
            new_email: {
                type: 'string',
                format: 'email',
                description: 'Nouvelle adresse email (optionnel)'
            }
        },
        oneOf: [
            { required: ['current_password', 'new_password'] },
            { required: ['current_password', 'new_email'] }
        ]
    }
};
exports.forgotPasswordSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                description: 'Email utilisateur pour réinitialisation du mot de passe'
            }
        }
    }
};
exports.resetPasswordSchema = {
    body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
            token: {
                type: 'string',
                minLength: 1,
                description: 'Token de réinitialisation envoyé par email'
            },
            password: {
                type: 'string',
                minLength: 8,
                description: 'Nouveau mot de passe'
            }
        }
    }
};
