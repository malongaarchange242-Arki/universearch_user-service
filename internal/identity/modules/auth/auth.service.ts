// src/modules/auth/auth.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import path from 'path';

// Cache en mémoire pour éviter les doubles soumissions (simple, pas scalable)
// En production, utiliser Redis avec TTL
const registrationLocks = new Map<string, number>();
const LOCK_TIMEOUT = 30000; // 30 secondes

/**
 * Acquérir un verrou pour éviter les doubles soumissions
 */
const acquireRegistrationLock = (email: string): boolean => {
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
const releaseRegistrationLock = (email: string): void => {
  registrationLocks.delete(email);
};

/**
 * Nettoyer les anciens verrous (garbage collection)
 */
const cleanupOldLocks = (): void => {
  const now = Date.now();
  for (const [email, timestamp] of registrationLocks.entries()) {
    if (now - timestamp > LOCK_TIMEOUT) {
      registrationLocks.delete(email);
    }
  }
};

// Nettoyer les anciens verrous toutes les 5 minutes
setInterval(cleanupOldLocks, 5 * 60 * 1000);

export interface RegisterPayload {
  email: string;
  password?: string; // Made optional
  nom: string;
  prenom?: string | null;
  telephone: string;
  profileType:
    | 'utilisateur'
    | 'admin'
    | 'superviseur'
    | 'universite'
    | 'bde'
    | 'centre_formation';
  nom_representant?: string | null;
  userType?: 'bachelier' | 'etudiant' | 'parent';
  dateNaissance?: string;
  genre?: string;
  quartier?: string;
}

export interface LoginPayload {
  // Login par email ET téléphone (sans password)
  email: string;
  telephone?: string;
  password?: string;
}

export interface AuthResult {
  userId: string;
  email: string;
  token?: string | null;
  refreshToken?: string | null;
  userType?: 'bachelier' | 'etudiant' | 'parent';
  gender?: string | null;
}

export interface LoginResult {
  userId: string;
  email: string | null;
  token: string;
  refreshToken: string;
}

export interface AuthTokenPayload {
  id: string;
  email: string | null;
  role: string;
}

export interface RefreshTokenPayload {
  id: string;
  type: 'refresh';
}

export interface RefreshResult {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    role: string;
  };
}

const getJwtSecret = (): string => {
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    secret = process.env.JWT_SECRET;
  }
  if (!secret) {
    throw new Error('Missing JWT_SECRET configuration');
  }
  return secret;
};

export const generateToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d',
  });
};

const generateRefreshTokenJwt = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '30d',
  });
};

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const getPublicAppUrl = (): string => {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.IDENTITY_PUBLIC_URL ||
    'https://universearch-pwlf.onrender.com';

  return configuredUrl.replace(/\/$/, '');
};

const issueRefreshToken = async (
  supabase: SupabaseClient,
  userId: string
): Promise<string> => {
  const refreshToken = generateRefreshTokenJwt({
    id: userId,
    type: 'refresh',
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const tokenHash = hashToken(refreshToken);

  const { error } = await supabase.from('auth_refresh_tokens').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Refresh token creation failed: ${error.message}`);
  }

  return refreshToken;
};

const ensureProfileRow = async (
  supabase: SupabaseClient,
  userId: string,
  profileData: {
    email: string;
    nom: string;
    prenom?: string | null;
    telephone: string;
    profileType: string;
    dateNaissance?: string | null;
    genre?: string | null;
    quartier?: string | null;
  }
): Promise<void> => {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id, nom, prenom, telephone, date_naissance, genre, email, profile_type')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(`PROFILE_QUERY_ERROR: ${existingProfileError.message}`);
  }

  const profilePayload: Record<string, any> = {
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

  const updatePayload: Record<string, any> = {};
  for (const key of Object.keys(profilePayload)) {
    if ((existingProfile as any)[key] == null && profilePayload[key] != null) {
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

export const revokeRefreshToken = async (
  supabase: SupabaseClient,
  refreshToken: string
): Promise<void> => {
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

export const refreshAccessToken = async (
  supabase: SupabaseClient,
  refreshToken: string
): Promise<RefreshResult> => {
  let decoded: string | Record<string, any>;

  try {
    decoded = jwt.verify(refreshToken, getJwtSecret());
  } catch (e) {
    throw new Error(`Invalid refresh token: ${(e as Error).message}`);
  }

  if (typeof decoded === 'string' || !decoded || !(decoded as any).id || (decoded as any).type !== 'refresh') {
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

  if ((storedToken as any).revoked_at) {
    throw new Error('Refresh token has been revoked');
  }

  if ((storedToken as any).expires_at <= now) {
    throw new Error('Refresh token has expired');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, profile_type')
    .eq('id', (storedToken as any).user_id)
    .single();

  if (profileError || !profile) {
    throw new Error('User not found for refresh token');
  }

  await revokeRefreshToken(supabase, refreshToken);

  const token = generateToken({
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

/**
 * Crée un utilisateur Supabase (le trigger PostgreSQL gère automatiquement le profile)
 * Idempotent et sécurisé contre les doubles créations
 */
export const registerUser = async (
  supabase: SupabaseClient,
  payload: RegisterPayload
): Promise<AuthResult> => {
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
    const token = generateToken({
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
    : crypto.randomBytes(16).toString('hex');

  // Métadonnées utilisateur pour Supabase Auth
  const userMetadata: Record<string, any> = {
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
    } catch (error) {
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
          user_type: userType!,
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
  } catch (error) {
    // En cas d'erreur dans la table spécifique, nettoyer tout
    await supabase.auth.admin.deleteUser(userId);
    throw error;
  }

  // Générer les tokens JWT
  const token = generateToken({
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
  } finally {
    // Toujours libérer le verrou
    releaseRegistrationLock(email);
  }
};


/**
 * Login utilisateur via email + téléphone (sans password)
 * ✅ Vérifier juste que email+téléphone existent - Accès automatique
 */
export const loginUser = async (
  supabase: SupabaseClient,
  payload: LoginPayload
): Promise<LoginResult> => {
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
      throw new Error(
        'Password login is only available for admin, universite and centre_formation'
      );
    }

    const token = generateToken({
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
    const token = generateToken({
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
  } catch (e) {
    console.error('Auth error:', (e as Error).message);
    throw new Error(`Authentication failed: ${(e as Error).message}`);
  }
};

/**
 * Forgot password - Envoyer un lien de réinitialisation via Supabase
 */
export const forgotPassword = async (
  supabase: SupabaseClient,
  email: string
): Promise<{ message: string }> => {
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

/**
 * Reset password helper: proxie la requête vers l'API Gotrue de Supabase
 * en utilisant le token (access_token) fourni par le client.
 */
export const resetPassword = async (
  _supabase: SupabaseClient,
  accessToken: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL configuration');

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
  } catch (err) {
    const e = err as Error;
    console.error('resetPassword proxy error:', e.message);
    throw new Error(e.message);
  }
};
