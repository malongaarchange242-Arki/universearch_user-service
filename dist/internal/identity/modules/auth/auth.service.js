"use strict";
// src/modules/auth/auth.service.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.loginUser = exports.registerUser = exports.refreshAccessToken = exports.revokeRefreshToken = exports.generateToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Cache en mémoire pour éviter les doubles soumissions (simple, pas scalable)
// En production, utiliser Redis avec TTL
const registrationLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 secondes
/**
 * Acquérir un verrou pour éviter les doubles soumissions
 */
const acquireRegistrationLock = (email) => {
    const now = Date.now();
    const existingLock = registrationLocks.get(email);
    if (existingLock && now - existingLock < LOCK_TIMEOUT) {
        return false; // Verrou actif
    }
    registrationLocks.set(email, now);
    return true;
};
/**
 * Libérer le verrou
 */
const releaseRegistrationLock = (email) => {
    registrationLocks.delete(email);
};
/**
 * Nettoyer les anciens verrous (garbage collection)
 */
const cleanupOldLocks = () => {
    const now = Date.now();
    for (const [email, timestamp] of registrationLocks.entries()) {
        if (now - timestamp > LOCK_TIMEOUT) {
            registrationLocks.delete(email);
        }
    }
};
// Nettoyer les anciens verrous toutes les 5 minutes
setInterval(cleanupOldLocks, 5 * 60 * 1000);
const getJwtSecret = () => {
    let secret = process.env.JWT_SECRET;
    if (!secret) {
        dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env') });
        secret = process.env.JWT_SECRET;
    }
    if (!secret) {
        throw new Error('Missing JWT_SECRET configuration');
    }
    return secret;
};
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn: '7d',
    });
};
exports.generateToken = generateToken;
const generateRefreshTokenJwt = (payload) => {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn: '30d',
    });
};
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
const getPublicAppUrl = () => {
    const configuredUrl = process.env.FRONTEND_URL ||
        process.env.PUBLIC_FRONTEND_URL ||
        process.env.IDENTITY_PUBLIC_URL ||
        'https://universearch-pwlf.onrender.com';
    return configuredUrl.replace(/\/$/, '');
};
const issueRefreshToken = async (supabase, userId) => {
    const refreshToken = generateRefreshTokenJwt({
        id: userId,
        type: 'refresh',
    });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const tokenHash = hashToken(refreshToken);
    const { error } = await supabase.from('auth_refresh_tokens').insert({
        id: crypto_1.default.randomUUID(),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
    });
    if (error) {
        throw new Error(`Refresh token creation failed: ${error.message}`);
    }
    return refreshToken;
};
const ensureProfileRow = async (supabase, userId, profileData) => {
    const { data: existingProfile, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, telephone, date_naissance, genre, email, profile_type')
        .eq('id', userId)
        .maybeSingle();
    if (existingProfileError) {
        throw new Error(`PROFILE_QUERY_ERROR: ${existingProfileError.message}`);
    }
    const profilePayload = {
        email: profileData.email,
        profile_type: profileData.profileType,
        nom: profileData.nom,
        prenom: profileData.prenom || null,
        telephone: profileData.telephone,
        date_naissance: profileData.dateNaissance || null,
        genre: profileData.genre || null,
        quartier: profileData.profileType === 'utilisateur' ? profileData.quartier || null : null,
    };
    if (!existingProfile) {
        const { error } = await supabase.from('profiles').insert({
            id: userId,
            ...profilePayload,
        });
        if (error) {
            throw new Error(`PROFILE_INSERT_ERROR: ${error.message}`);
        }
        return;
    }
    const updatePayload = {};
    for (const key of Object.keys(profilePayload)) {
        if (existingProfile[key] == null && profilePayload[key] != null) {
            updatePayload[key] = profilePayload[key];
        }
    }
    // Keep profile_type and email in sync if they are missing or stale.
    updatePayload.email = profilePayload.email;
    updatePayload.profile_type = profilePayload.profile_type;
    if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId);
        if (error) {
            throw new Error(`PROFILE_UPDATE_ERROR: ${error.message}`);
        }
    }
};
const revokeRefreshToken = async (supabase, refreshToken) => {
    const tokenHash = hashToken(refreshToken);
    const { error } = await supabase
        .from('auth_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null);
    if (error) {
        throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
};
exports.revokeRefreshToken = revokeRefreshToken;
const refreshAccessToken = async (supabase, refreshToken) => {
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refreshToken, getJwtSecret());
    }
    catch (e) {
        throw new Error(`Invalid refresh token: ${e.message}`);
    }
    if (typeof decoded === 'string' || !decoded || !decoded.id || decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token payload');
    }
    const tokenHash = hashToken(refreshToken);
    const now = new Date().toISOString();
    const { data: storedToken, error: tokenError } = await supabase
        .from('auth_refresh_tokens')
        .select('id, user_id, expires_at, revoked_at')
        .eq('token_hash', tokenHash)
        .single();
    if (tokenError || !storedToken) {
        throw new Error('Refresh token not found');
    }
    if (storedToken.revoked_at) {
        throw new Error('Refresh token has been revoked');
    }
    if (storedToken.expires_at <= now) {
        throw new Error('Refresh token has expired');
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, profile_type')
        .eq('id', storedToken.user_id)
        .single();
    if (profileError || !profile) {
        throw new Error('User not found for refresh token');
    }
    await (0, exports.revokeRefreshToken)(supabase, refreshToken);
    const token = (0, exports.generateToken)({
        id: profile.id,
        email: profile.email ?? null,
        role: profile.profile_type,
    });
    const nextRefreshToken = await issueRefreshToken(supabase, profile.id);
    return {
        token,
        refreshToken: nextRefreshToken,
        user: {
            id: profile.id,
            email: profile.email ?? null,
            role: profile.profile_type,
        },
    };
};
exports.refreshAccessToken = refreshAccessToken;
/**
 * Crée un utilisateur Supabase (le trigger PostgreSQL gère automatiquement le profile)
 * Idempotent et sécurisé contre les doubles créations
 */
const registerUser = async (supabase, payload) => {
    const { email, nom, prenom, telephone, profileType, userType, dateNaissance, genre, quartier, } = payload;
    // Validation des données d'entrée
    if (!email || !nom || !telephone || !profileType) {
        throw new Error('Missing required fields: email, nom, telephone, profileType');
    }
    // Validation spécifique pour utilisateur
    if (profileType === 'utilisateur' && !userType) {
        throw new Error('userType is required for utilisateur profile type');
    }
    if (profileType === 'utilisateur' && !quartier) {
        throw new Error('quartier is required for utilisateur profile type');
    }
    // Protection contre les doubles soumissions
    if (!acquireRegistrationLock(email)) {
        throw new Error('REGISTRATION_IN_PROGRESS');
    }
    try {
        // Vérifier si l'utilisateur existe déjà (idempotent)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, profile_type')
            .eq('email', email)
            .single();
        if (existingProfile) {
            // Utilisateur existe déjà - retourner les infos existantes
            const userId = existingProfile.id;
            // Générer les tokens pour l'utilisateur existant
            const token = (0, exports.generateToken)({
                id: userId,
                email: email,
                role: existingProfile.profile_type,
            });
            const refreshToken = await issueRefreshToken(supabase, userId);
            return {
                userId,
                email,
                token,
                refreshToken,
                userType: profileType === 'utilisateur' ? userType : undefined,
                gender: genre,
            };
        }
        // Générer un mot de passe sécurisé si non fourni
        const password = payload.password && payload.password.trim().length >= 8
            ? payload.password
            : crypto_1.default.randomBytes(16).toString('hex');
        // Métadonnées utilisateur pour Supabase Auth
        const userMetadata = {
            profile_type: profileType,
            nom,
            prenom: prenom || null,
            telephone,
            date_naissance: dateNaissance || null,
            genre: genre || null,
        };
        if (profileType === 'utilisateur') {
            userMetadata.quartier = quartier || null;
        }
        // Ajouter userType pour les utilisateurs
        if (profileType === 'utilisateur' && userType) {
            userMetadata.user_type = userType;
        }
        // Créer l'utilisateur Supabase Auth (le trigger crée automatiquement le profile)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: userMetadata,
        });
        if (authError) {
            // Gestion spécifique des erreurs Supabase
            if (authError.message?.includes('already registered')) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }
            if (authError.message?.includes('Invalid email')) {
                throw new Error('INVALID_EMAIL_FORMAT');
            }
            if (authError.message?.includes('Password should be at least')) {
                throw new Error('PASSWORD_TOO_WEAK');
            }
            throw new Error(`SUPABASE_AUTH_ERROR: ${authError.message}`);
        }
        if (!authData.user) {
            throw new Error('SUPABASE_USER_CREATION_FAILED');
        }
        const userId = authData.user.id;
        // Attendre que le trigger PostgreSQL crée le profile (retry avec backoff)
        let profileCreated = false;
        let retryCount = 0;
        const maxRetries = 5;
        while (!profileCreated && retryCount < maxRetries) {
            try {
                const { data: profileCheck } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', userId)
                    .single();
                if (profileCheck) {
                    profileCreated = true;
                    break;
                }
            }
            catch (error) {
                // Profile pas encore créé, attendre
            }
            // Backoff exponentiel: 100ms, 200ms, 400ms, 800ms, 1600ms
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
            retryCount++;
        }
        await ensureProfileRow(supabase, userId, {
            email,
            nom,
            prenom,
            telephone,
            profileType,
            dateNaissance: dateNaissance || null,
            genre: genre || null,
            quartier: quartier || null,
        });
        // Créer l'enregistrement dans la table spécifique selon profileType
        try {
            switch (profileType) {
                case 'utilisateur': {
                    const { error } = await supabase.from('utilisateurs').insert({
                        id: userId,
                        user_type: userType,
                    });
                    if (error) {
                        throw new Error(`UTILISATEUR_TABLE_ERROR: ${error.message}`);
                    }
                    break;
                }
                case 'admin': {
                    const { error } = await supabase.from('admins').insert({ id: userId });
                    if (error) {
                        throw new Error(`ADMIN_TABLE_ERROR: ${error.message}`);
                    }
                    break;
                }
                case 'superviseur': {
                    const { error } = await supabase.from('superviseurs').insert({ id: userId });
                    if (error) {
                        throw new Error(`SUPERVISEUR_TABLE_ERROR: ${error.message}`);
                    }
                    break;
                }
                case 'universite': {
                    const { error } = await supabase.from('universites').insert({
                        id: userId,
                        profile_id: userId,
                        nom,
                        nom_representant: payload.nom_representant ?? null,
                        email,
                        contacts: telephone ?? null,
                        statut: 'PENDING',
                        date_creation: new Date().toISOString(),
                    });
                    if (error) {
                        throw new Error(`UNIVERSITE_TABLE_ERROR: ${error.message}`);
                    }
                    break;
                }
                case 'centre_formation': {
                    const { error } = await supabase.from('centres_formation').insert({
                        id: userId,
                        profile_id: userId,
                        nom,
                        nom_representant: payload.nom_representant ?? null,
                        email,
                        contacts: telephone ?? null,
                        statut: 'PENDING',
                        date_creation: new Date().toISOString(),
                    });
                    if (error) {
                        throw new Error(`CENTRE_TABLE_ERROR: ${error.message}`);
                    }
                    break;
                }
                default:
                    // Pour les autres types, pas de table spécifique
                    break;
            }
        }
        catch (error) {
            // En cas d'erreur dans la table spécifique, nettoyer tout
            await supabase.auth.admin.deleteUser(userId);
            throw error;
        }
        // Générer les tokens JWT
        const token = (0, exports.generateToken)({
            id: userId,
            email,
            role: profileType,
        });
        const refreshToken = await issueRefreshToken(supabase, userId);
        return {
            userId,
            email,
            token,
            refreshToken,
            userType: profileType === 'utilisateur' ? userType : undefined,
            gender: genre,
        };
    }
    finally {
        // Toujours libérer le verrou
        releaseRegistrationLock(email);
    }
};
exports.registerUser = registerUser;
/**
 * Login utilisateur via email + téléphone (sans password)
 * ✅ Vérifier juste que email+téléphone existent - Accès automatique
 */
const loginUser = async (supabase, payload) => {
    const { email, telephone, password } = payload;
    if (password) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (authError || !authData.user) {
            console.error('Password login failed:', authError?.message);
            throw new Error('Invalid email or password');
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, profile_type')
            .eq('id', authData.user.id)
            .single();
        if (profileError || !profile) {
            throw new Error('User profile not found');
        }
        if (!['universite', 'centre_formation', 'admin'].includes(profile.profile_type)) {
            throw new Error('Password login is only available for admin, universite and centre_formation');
        }
        const token = (0, exports.generateToken)({
            id: profile.id,
            email: profile.email ?? null,
            role: profile.profile_type,
        });
        const refreshToken = await issueRefreshToken(supabase, profile.id);
        return {
            userId: profile.id,
            email: profile.email ?? null,
            token,
            refreshToken,
        };
    }
    // 1️⃣ Vérifier que l'utilisateur existe avec email (téléphone optionnel)
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, profile_type, telephone')
        .eq('email', email)
        .single(); // Retourne une seule ligne
    if (profileError || !profiles) {
        console.error('Login failed:', profileError?.message);
        throw new Error('User not found with provided email');
    }
    // 2️⃣ Si téléphone est fourni, vérifier qu'il correspond
    if (telephone && profiles.telephone !== telephone) {
        console.error(`Phone mismatch: expected ${telephone}, got ${profiles.telephone}`);
        throw new Error('Email found but phone number does not match');
    }
    const userId = profiles.id;
    const userEmail = profiles.email;
    const role = profiles.profile_type;
    if (!role) {
        throw new Error('User profile is missing a role');
    }
    try {
        const token = (0, exports.generateToken)({
            id: userId,
            email: userEmail ?? null,
            role,
        });
        const refreshToken = await issueRefreshToken(supabase, userId);
        return {
            userId,
            email: userEmail ?? null,
            token,
            refreshToken,
        };
    }
    catch (e) {
        console.error('Auth error:', e.message);
        throw new Error(`Authentication failed: ${e.message}`);
    }
};
exports.loginUser = loginUser;
/**
 * Forgot password - Envoyer un lien de réinitialisation via Supabase
 */
const forgotPassword = async (supabase, email) => {
    // Vérifier que l'utilisateur existe
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
    if (profileError) {
        throw new Error(`Database error: ${profileError.message}`);
    }
    if (!profile) {
        // Ne pas révéler si l'email existe ou non (sécurité)
        return {
            message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
        };
    }
    // Utiliser la fonction Supabase native pour envoyer un lien de réinitialisation
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getPublicAppUrl()}/auth/reset-password`,
    });
    if (error) {
        console.error('Reset password email error:', error.message);
        throw new Error(`Failed to send reset email: ${error.message}`);
    }
    return {
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };
};
exports.forgotPassword = forgotPassword;
/**
 * Reset password helper: proxie la requête vers l'API Gotrue de Supabase
 * en utilisant le token (access_token) fourni par le client.
 */
const resetPassword = async (_supabase, accessToken, newPassword) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl)
        throw new Error('Missing SUPABASE_URL configuration');
    try {
        const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ password: newPassword }),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed to reset password: ${text}`);
        }
        return { message: 'Mot de passe réinitialisé avec succès' };
    }
    catch (err) {
        const e = err;
        console.error('resetPassword proxy error:', e.message);
        throw new Error(e.message);
    }
};
exports.resetPassword = resetPassword;
