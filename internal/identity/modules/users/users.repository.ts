// src/modules/users/users.repository.ts

import { SupabaseClient } from '@supabase/supabase-js';

export interface UserRecord {
  id: string;
  user_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  profile_type: string | null;
  date_naissance: string | null;
  genre: string | null;
}

export class UsersRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Récupère un utilisateur par son ID
   */
  async getById(id: string): Promise<UserRecord | null> {
    // Essayer la jointure si elle existe.
    try {
      const { data, error } = await this.supabase
        .from('utilisateurs')
        .select(
          `id, user_type, created_at, updated_at, profiles(email, nom, prenom, telephone, profile_type, date_naissance, genre)`
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

      return {
        id: data.id,
        user_type: data.user_type,
        created_at: data.created_at,
        updated_at: data.updated_at,
        email: profile?.email ?? null,
        nom: profile?.nom ?? null,
        prenom: profile?.prenom ?? null,
        telephone: profile?.telephone ?? null,
        profile_type: profile?.profile_type ?? null,
        date_naissance: profile?.date_naissance ?? null,
        genre: profile?.genre ?? null,
      };
    } catch (err) {
      // Fallback : récupérer l'utilisateur puis faire une requête séparée sur profiles
      const { data: user, error: userError } = await this.supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) throw new Error(userError.message);
      if (!user) return null;

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw new Error(profileError.message);

      return {
        id: user.id,
        user_type: user.user_type,
        created_at: user.created_at,
        updated_at: user.updated_at,
        email: profile?.email ?? null,
        nom: profile?.nom ?? null,
        prenom: profile?.prenom ?? null,
        telephone: profile?.telephone ?? null,
        profile_type: profile?.profile_type ?? null,
        date_naissance: profile?.date_naissance ?? null,
        genre: profile?.genre ?? null,
      };
    }
  }

  /**
   * Liste les utilisateurs avec filtres et pagination
   */
  async list(
    profileType?: string,
    limit = 20,
    offset = 0
  ): Promise<UserRecord[]> {
    // Essayer d'abord une jointure directe via Supabase si la relation est définie.
    try {
      let query = this.supabase
        .from('utilisateurs')
        .select(
          `id, user_type, created_at, updated_at, profiles(email, nom, prenom, telephone, profile_type, date_naissance, genre)`
        );

      if (profileType) {
        query = query.eq('user_type', profileType);
      }

      const { data, error } = await query.range(offset, offset + limit - 1);

      if (error) throw error;
      if (!data) return [];

      return data.map((row: any) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          user_type: row.user_type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          email: profile?.email ?? null,
          nom: profile?.nom ?? null,
          prenom: profile?.prenom ?? null,
          telephone: profile?.telephone ?? null,
          profile_type: profile?.profile_type ?? null,
          date_naissance: profile?.date_naissance ?? null,
          genre: profile?.genre ?? null,
        };
      });
    } catch (err) {
      // Si la jointure n'est pas configurée côté Supabase, faire la jointure manuellement.
      const usersQuery = this.supabase
        .from('utilisateurs')
        .select('*')
        .range(offset, offset + limit - 1);

      if (profileType) {
        usersQuery.eq('user_type', profileType);
      }

      const { data: users, error: usersError } = await usersQuery;
      if (usersError) throw new Error(usersError.message);
      if (!users) return [];

      const ids = users.map((u: any) => u.id).filter(Boolean);
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('*')
        .in('id', ids);

      if (profilesError) throw new Error(profilesError.message);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return users.map((u: any) => {
        const profile = profileMap.get(u.id) || {};
        return {
          id: u.id,
          user_type: u.user_type,
          created_at: u.created_at,
          updated_at: u.updated_at,
          email: profile.email ?? null,
          nom: profile.nom ?? null,
          prenom: profile.prenom ?? null,
          telephone: profile.telephone ?? null,
          profile_type: profile.profile_type ?? null,
          date_naissance: profile.date_naissance ?? null,
          genre: profile.genre ?? null,
        };
      });
    }
  }

  /**
   * Met à jour un utilisateur
   */
  async update(id: string, payload: Partial<UserRecord>): Promise<UserRecord> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return data;
  }

  /**
   * Supprime un utilisateur
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  /**
   * Compte le nombre total d'utilisateurs (profile_type = 'utilisateur')
   */
  async count(): Promise<number> {
    // Compte le nombre d'utilisateurs (table `utilisateurs`), correspondant aux profils de type 'utilisateur'.
    const { count, error } = await this.supabase
      .from('utilisateurs')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(error.message);

    return count || 0;
  }
}
