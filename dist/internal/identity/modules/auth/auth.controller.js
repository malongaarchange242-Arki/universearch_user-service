"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordHandler = exports.forgotPasswordHandler = exports.updateSecurityHandler = exports.logoutHandler = exports.checkEmailHandler = exports.refreshHandler = exports.loginHandler = exports.registerHandler = void 0;
const auth_service_1 = require("./auth.service");
const supabase_1 = require("../../plugins/supabase"); // Supabase Admin client
const buildFullName = (prenom, nom) => {
    const fullName = [prenom, nom]
        .filter((value) => value && String(value).trim().length > 0)
        .join(' ')
        .trim();
    return fullName || null;
};
const getLoginProfileSummary = async (userId) => {
    let profileType = null;
    let userType = null;
    let nom = null;
    let prenom = null;
    let avatarUrl = null;
    const { data: profileData, error: profileError } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('profile_type, nom, prenom, avatar_url')
        .eq('id', userId)
        .single();
    if (profileError) {
        throw profileError;
    }
    if (profileData) {
        profileType = profileData.profile_type ?? null;
        nom = profileData.nom ?? null;
        prenom = profileData.prenom ?? null;
        avatarUrl = profileData.avatar_url ?? null;
    }
    if (profileType === 'utilisateur') {
        const { data: userTypeData, error: userTypeError } = await supabase_1.supabaseAdmin
            .from('utilisateurs')
            .select('user_type')
            .eq('id', userId)
            .single();
        if (!userTypeError && userTypeData && userTypeData.user_type) {
            userType = userTypeData.user_type;
        }
    }
    return {
        profileType,
        userType,
        nom,
        prenom,
        fullName: buildFullName(prenom, nom),
        avatarUrl,
    };
};
/**
 * Normalise le userType vers les valeurs autorisées.
 * Les valeurs non reconnues sont converties en 'parent'.
 */
const normalizeUserType = (userType) => {
    if (!userType)
        return 'parent';
    const normalized = userType.toLowerCase().trim();
    if (normalized === 'bachelier')
        return 'bachelier';
    if (normalized === 'etudiant')
        return 'etudiant';
    if (normalized === 'parent')
        return 'parent';
    // Toute autre valeur est normalisée vers 'parent'
    return 'parent';
};
/**
 * Handler de création de compte utilisateur.
 * Idempotent et protégé contre les doubles soumissions
 */
const registerHandler = async (request, reply) => {
    const { email, profileType, userType } = request.body;
    // Normaliser le userType si fourni
    const normalizedUserType = userType ? normalizeUserType(userType) : undefined;
    // Créer une copie du body avec le userType normalisé
    const normalizedBody = {
        ...request.body,
        userType: normalizedUserType,
    };
    request.log.info({
        action: 'user_registration_attempt',
        email,
        profileType,
        userType: normalizedUserType,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
    });
    try {
        const result = await (0, auth_service_1.registerUser)(supabase_1.supabaseAdmin, normalizedBody);
        request.log.info({
            action: 'user_registration_success',
            userId: result.userId,
            email,
            profileType,
        });
        reply.status(201).send({
            success: true,
            message: 'Compte créé avec succès',
            data: {
                userId: result.userId,
                email: result.email,
                token: result.token,
                refreshToken: result.refreshToken,
                profileType,
                userType: result.userType,
            },
        });
    }
    catch (error) {
        const err = error;
        const errorMessage = err.message;
        request.log.error({
            action: 'user_registration_failed',
            email,
            profileType,
            error: errorMessage,
            stack: err.stack,
        });
        // Gestion des erreurs avec codes HTTP appropriés
        let statusCode = 500;
        let userMessage = 'Erreur interne du serveur';
        if (errorMessage === 'EMAIL_ALREADY_EXISTS') {
            statusCode = 409;
            userMessage = 'Cet email est déjà enregistré';
        }
        else if (errorMessage === 'INVALID_EMAIL_FORMAT') {
            statusCode = 400;
            userMessage = 'Format d\'email invalide';
        }
        else if (errorMessage === 'PASSWORD_TOO_WEAK') {
            statusCode = 400;
            userMessage = 'Mot de passe trop faible (minimum 8 caractères)';
        }
        else if (errorMessage === 'REGISTRATION_IN_PROGRESS') {
            statusCode = 429;
            userMessage = 'Inscription en cours, veuillez patienter';
        }
        else if (errorMessage === 'Missing required fields: email, nom, telephone, profileType') {
            statusCode = 400;
            userMessage = 'Champs requis manquants: email, nom, téléphone, type de profil';
        }
        else if (errorMessage === 'userType is required for utilisateur profile type') {
            statusCode = 400;
            userMessage = 'Le type d\'utilisateur est requis pour les comptes utilisateur';
        }
        else if (errorMessage.includes('SUPABASE_AUTH_ERROR')) {
            statusCode = 500;
            userMessage = 'Erreur d\'authentification temporaire, veuillez réessayer';
        }
        else if (errorMessage === 'PROFILE_CREATION_TIMEOUT') {
            statusCode = 500;
            userMessage = 'Erreur de création du profil, veuillez réessayer';
        }
        else if (errorMessage.includes('TABLE_ERROR')) {
            statusCode = 500;
            userMessage = 'Erreur de configuration du compte, veuillez contacter le support';
        }
        reply.status(statusCode).send({
            success: false,
            error: userMessage,
            code: errorMessage, // Pour le debugging côté client
        });
    }
};
exports.registerHandler = registerHandler;
/**
 * Handler de connexion utilisateur.
 * Accepte email + téléphone (sans password)
 */
const loginHandler = async (request, reply) => {
    try {
        const { email, telephone, password } = request.body;
        // Connexion via le service (email + password pour admin et organisations,
        // email + téléphone pour le flux historique utilisateur)
        const result = await (0, auth_service_1.loginUser)(supabase_1.supabaseAdmin, {
            email,
            telephone,
            password,
        });
        // Récupérer profile_type et user_type
        let profileType = null;
        let userType = null;
        let nom = null;
        let prenom = null;
        let fullName = null;
        let avatarUrl = null;
        let genre = null;
        try {
            // 1️⃣ Récupérer profile_type
            const { data: profileData, error: profileError } = await supabase_1.supabaseAdmin
                .from('profiles')
                .select('profile_type, nom, prenom, avatar_url, genre')
                .eq('id', result.userId)
                .single();
            if (!profileError && profileData && profileData.profile_type) {
                profileType = profileData.profile_type;
                nom = profileData.nom ?? null;
                prenom = profileData.prenom ?? null;
                fullName = buildFullName(prenom, nom);
                avatarUrl = profileData.avatar_url ?? null;
                genre = profileData.genre ?? null;
            }
            // 2️⃣ Si profile_type = 'utilisateur', récupérer user_type depuis table utilisateurs
            if (profileType === 'utilisateur') {
                const { data: userTypeData, error: userTypeError } = await supabase_1.supabaseAdmin
                    .from('utilisateurs')
                    .select('user_type')
                    .eq('id', result.userId)
                    .single();
                if (!userTypeError && userTypeData && userTypeData.user_type) {
                    userType = userTypeData.user_type;
                }
            }
        }
        catch (e) {
            request.log.warn({ err: e }, 'Failed to fetch profile data for login response');
        }
        // Retourner token + user avec profile_type ET user_type
        return reply.status(200).send({
            token: result.token,
            refresh_token: result.refreshToken,
            user: {
                id: result.userId,
                email: result.email ?? null,
                nom,
                prenom,
                full_name: fullName,
                avatar_url: avatarUrl,
                profile_type: profileType,
                user_type: userType,
                gender: genre,
            },
        });
    }
    catch (err) {
        request.log.error(err);
        reply.status(500).send({
            success: false,
            error: 'Internal server error',
        });
    }
};
exports.loginHandler = loginHandler;
const refreshHandler = async (request, reply) => {
    try {
        const refreshToken = request.body?.refresh_token;
        if (!refreshToken) {
            return reply.status(400).send({
                success: false,
                error: 'refresh_token is required',
            });
        }
        const result = await (0, auth_service_1.refreshAccessToken)(supabase_1.supabaseAdmin, refreshToken);
        let profileType = result.user.role;
        let userType = null;
        let nom = null;
        let prenom = null;
        let fullName = null;
        let avatarUrl = null;
        try {
            const profileSummary = await getLoginProfileSummary(result.user.id);
            profileType = profileSummary.profileType ?? profileType;
            userType = profileSummary.userType;
            nom = profileSummary.nom;
            prenom = profileSummary.prenom;
            fullName = profileSummary.fullName;
            avatarUrl = profileSummary.avatarUrl;
        }
        catch (e) {
            request.log.warn({ err: e }, 'Failed to fetch profile data for refresh response');
        }
        return reply.status(200).send({
            token: result.token,
            refresh_token: result.refreshToken,
            user: {
                id: result.user.id,
                email: result.user.email,
                nom,
                prenom,
                full_name: fullName,
                avatar_url: avatarUrl,
                profile_type: profileType,
                user_type: userType,
            },
        });
    }
    catch (error) {
        request.log.error(error);
        return reply.status(401).send({
            success: false,
            error: error.message,
        });
    }
};
exports.refreshHandler = refreshHandler;
// Simple in-memory rate limiter for check-email endpoint
const _checkEmailRate = new Map();
const CHECK_EMAIL_MAX = 10; // max requests
const CHECK_EMAIL_WINDOW = 60 * 1000; // window ms
/**
 * Handler pour vérifier l'existence d'un email dans la table `admis`.
 * POST /auth/check-email { email }
 */
const checkEmailHandler = async (request, reply) => {
    try {
        const ip = request.ip || request.raw.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const entry = _checkEmailRate.get(ip);
        if (!entry || now - entry.first > CHECK_EMAIL_WINDOW) {
            _checkEmailRate.set(ip, { count: 1, first: now });
        }
        else {
            entry.count += 1;
            if (entry.count > CHECK_EMAIL_MAX) {
                request.log.warn({ ip, email: request.body?.email }, 'Rate limit exceeded for check-email');
                return reply.status(429).send({ error: 'Too many requests' });
            }
            _checkEmailRate.set(ip, entry);
        }
        const { email } = request.body;
        if (!email)
            return reply.status(400).send({ error: 'Email required' });
        // Preferred: query `profiles` table where emails are stored
        let data = null;
        let error = null;
        try {
            const r = await supabase_1.supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
            data = r.data;
            error = r.error;
        }
        catch (e) {
            error = e;
        }
        // If profiles table not available, try legacy tables (`admis` or `admins`)
        if (error || !data) {
            try {
                const r2 = await supabase_1.supabaseAdmin.from('admis').select('id').eq('email', email).maybeSingle();
                data = r2.data;
                error = r2.error;
            }
            catch (e2) {
                error = e2;
            }
        }
        if (error && /Could not find the table 'public.admis'/.test(String(error?.message || error))) {
            try {
                const r3 = await supabase_1.supabaseAdmin.from('admins').select('id').eq('email', email).maybeSingle();
                data = r3.data;
                error = r3.error;
            }
            catch (e3) {
                error = e3;
            }
        }
        if (error) {
            request.log.error({ err: error, email }, 'Failed to query email tables');
            return reply.status(500).send({ error: 'Internal server error' });
        }
        const exists = !!(data && data.id);
        // Always return a generic shape; never leak extra details
        return reply.status(200).send({ exists });
    }
    catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal server error' });
    }
};
exports.checkEmailHandler = checkEmailHandler;
/**
 * Handler de déconnexion utilisateur.
 */
const logoutHandler = async (request, reply) => {
    try {
        const refreshToken = request.body?.refresh_token;
        if (refreshToken) {
            await (0, auth_service_1.revokeRefreshToken)(supabase_1.supabaseAdmin, refreshToken);
        }
    }
    catch (error) {
        request.log.warn({ err: error }, 'Failed to revoke refresh token during logout');
    }
    reply.status(200).send({
        success: true,
        message: 'Logged out successfully',
    });
};
exports.logoutHandler = logoutHandler;
/**
 * Handler de mise à jour des informations de sécurité (mot de passe et email).
 */
const updateSecurityHandler = async (request, reply) => {
    try {
        const { current_password, new_password, new_email } = request.body;
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        // Vérifier le mot de passe actuel
        const { data: userData, error: userError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (userError || !userData.user) {
            return reply.status(404).send({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        // Vérifier le mot de passe actuel en essayant de se connecter
        const { error: signInError } = await supabase_1.supabaseAdmin.auth.signInWithPassword({
            email: userData.user.email,
            password: current_password
        });
        if (signInError) {
            return reply.status(401).send({
                success: false,
                error: 'Mot de passe actuel incorrect'
            });
        }
        // Mettre à jour l'email si fourni
        if (new_email && new_email !== userData.user.email) {
            const { error: emailError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(userId, {
                email: new_email
            });
            if (emailError) {
                request.log.error({ err: emailError, userId }, 'Failed to update email');
                return reply.status(400).send({
                    success: false,
                    error: 'Erreur lors de la mise à jour de l\'email'
                });
            }
        }
        // Mettre à jour le mot de passe si fourni
        if (new_password) {
            const { error: passwordError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(userId, {
                password: new_password
            });
            if (passwordError) {
                request.log.error({ err: passwordError, userId }, 'Failed to update password');
                return reply.status(400).send({
                    success: false,
                    error: 'Erreur lors de la mise à jour du mot de passe'
                });
            }
        }
        reply.status(200).send({
            success: true,
            message: 'Informations de sécurité mises à jour avec succès'
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(500).send({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
};
exports.updateSecurityHandler = updateSecurityHandler;
/**
 * Handler pour la réinitialisation de mot de passe via email
 */
const forgotPasswordHandler = async (request, reply) => {
    try {
        const { email } = request.body;
        if (!email) {
            return reply.status(400).send({
                success: false,
                error: 'Email requis'
            });
        }
        request.log.info({
            action: 'forgot_password_attempt',
            email,
            ip: request.ip,
        });
        const result = await (0, auth_service_1.forgotPassword)(supabase_1.supabaseAdmin, email);
        request.log.info({
            action: 'forgot_password_sent',
            email,
        });
        reply.status(200).send({
            success: true,
            message: result.message
        });
    }
    catch (error) {
        const err = error;
        request.log.error({
            action: 'forgot_password_failed',
            error: err.message,
            email: request.body?.email,
        });
        // Retourner un message générique pour des raisons de sécurité
        reply.status(200).send({
            success: true,
            message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.'
        });
    }
};
exports.forgotPasswordHandler = forgotPasswordHandler;
/**
 * Handler pour la réinitialisation du mot de passe avec token
 */
const resetPasswordHandler = async (request, reply) => {
    try {
        const { token, password } = request.body;
        if (!token || !password) {
            return reply.status(400).send({
                success: false,
                error: 'Token et mot de passe requis'
            });
        }
        request.log.info({
            action: 'reset_password_attempt',
            ip: request.ip,
        });
        const result = await (0, auth_service_1.resetPassword)(supabase_1.supabaseAdmin, token, password);
        request.log.info({
            action: 'reset_password_success',
        });
        reply.status(200).send({
            success: true,
            message: result.message
        });
    }
    catch (error) {
        const err = error;
        request.log.error({
            action: 'reset_password_failed',
            error: err.message,
        });
        reply.status(400).send({
            success: false,
            error: 'Erreur lors de la réinitialisation du mot de passe. Le lien a peut-être expiré.'
        });
    }
};
exports.resetPasswordHandler = resetPasswordHandler;
