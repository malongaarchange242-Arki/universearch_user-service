import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateBdeDto {
  nom?: string;
  description?: string | null;
  logo_url?: string | null;
  video_url?: string | null;
  pres_lastname?: string | null;
  pres_firstname?: string | null;
  pres_phone?: string | null;
  pres_email?: string | null;
}

export interface UpdateBdeDto {
  nom?: string;
  description?: string | null;
  logo_url?: string | null;
  video_url?: string | null;
  pres_lastname?: string | null;
  pres_firstname?: string | null;
  pres_phone?: string | null;
  pres_email?: string | null;
  statut?: 'actif' | 'inactif' | 'suspendu';
}

export interface BdeEntity {
  id: string;
  universite_id: string;
  profile_id: string;
  nom: string;
  description: string | null;
  logo_url: string | null;
  video_url: string | null;
  pres_lastname: string | null;
  pres_firstname: string | null;
  pres_phone: string | null;
  pres_email: string | null;
  statut: 'actif' | 'inactif' | 'suspendu';
  date_creation: string;
}

export class BdeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new BDE for a university
   * Linked to the university's profile (profile_id)
   */
  async createBde(data: CreateBdeDto, profileId: string): Promise<BdeEntity> {
    try {
      const { data: universite, error: universiteError } = await this.supabase
        .from('universites')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (universiteError || !universite) {
        throw new Error('Universite not found for authenticated profile');
      }

      const { data: bde, error } = await this.supabase
        .from('bde')
        .insert({
          // Do not trust client-provided universite_id — use authenticated profileId
          universite_id: (universite as any).id,
          profile_id: profileId,
          nom: data.nom || null,
          description: data.description || null,
          logo_url: data.logo_url || null,
          video_url: data.video_url || null,
          pres_lastname: data.pres_lastname || null,
          pres_firstname: data.pres_firstname || null,
          pres_phone: data.pres_phone || null,
          pres_email: data.pres_email || null,
          statut: 'actif',
          date_creation: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create BDE: ${error.message}`);
      return bde as BdeEntity;
    } catch (err) {
      throw new Error(`BDE creation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Get BDE by ID
   */
  async getBdeById(bdeId: string): Promise<BdeEntity | null> {
    try {
      const { data, error } = await this.supabase
        .from('bde')
        .select('*')
        .eq('id', bdeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch BDE: ${error.message}`);
      }
      return (data as BdeEntity) || null;
    } catch (err) {
      throw new Error(`BDE fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Get BDE for a specific university
   * Each university can have only one BDE
   */
  async getBdeByUniversiteId(universiteId: string): Promise<BdeEntity | null> {
    try {
      const { data, error } = await this.supabase
        .from('bde')
        .select('*')
        .eq('universite_id', universiteId)
        .eq('statut', 'actif')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch BDE: ${error.message}`);
      }
      return (data as BdeEntity) || null;
    } catch (err) {
      throw new Error(`BDE fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Get BDE for the authenticated university profile.
   * Tries the resolved university entity id first, then legacy fallbacks.
   */
  async getMyBde(profileId: string): Promise<BdeEntity | null> {
    try {
      const { data: universite, error: universiteError } = await this.supabase
        .from('universites')
        .select('id, profile_id')
        .eq('profile_id', profileId)
        .single();

      if (universiteError && universiteError.code !== 'PGRST116') {
        throw new Error(`Failed to resolve university for profile: ${universiteError.message}`);
      }

      const candidateIds = [
        (universite as any)?.id,
        (universite as any)?.profile_id,
        profileId,
      ].filter(Boolean);

      for (const candidateId of candidateIds) {
        const { data, error } = await this.supabase
          .from('bde')
          .select('*')
          .eq('universite_id', candidateId)
          .eq('statut', 'actif')
          .single();

        if (!error && data) {
          return data as BdeEntity;
        }

        if (error && error.code !== 'PGRST116') {
          throw new Error(`Failed to fetch BDE: ${error.message}`);
        }
      }

      const { data: legacyByProfile, error: legacyError } = await this.supabase
        .from('bde')
        .select('*')
        .eq('profile_id', profileId)
        .eq('statut', 'actif')
        .single();

      if (legacyError && legacyError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch legacy BDE by profile: ${legacyError.message}`);
      }

      return (legacyByProfile as BdeEntity) || null;
    } catch (err) {
      throw new Error(`BDE fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Update BDE information
   */
  async updateBde(bdeId: string, data: UpdateBdeDto): Promise<BdeEntity> {
    try {
      const updatePayload: Record<string, any> = {};
      if (data.nom !== undefined) updatePayload.nom = data.nom;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.logo_url !== undefined) updatePayload.logo_url = data.logo_url;
      if (data.video_url !== undefined) updatePayload.video_url = data.video_url;
      if (data.pres_lastname !== undefined) updatePayload.pres_lastname = data.pres_lastname;
      if (data.pres_firstname !== undefined) updatePayload.pres_firstname = data.pres_firstname;
      if (data.pres_phone !== undefined) updatePayload.pres_phone = data.pres_phone;
      if (data.pres_email !== undefined) updatePayload.pres_email = data.pres_email;
      if (data.statut !== undefined) updatePayload.statut = data.statut;

      const { data: updated, error } = await this.supabase
        .from('bde')
        .update(updatePayload)
        .eq('id', bdeId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update BDE: ${error.message}`);
      return updated as BdeEntity;
    } catch (err) {
      throw new Error(`BDE update error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Delete BDE (soft delete by changing status)
   */
  async deleteBde(bdeId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('bde')
        .update({ statut: 'inactif' })
        .eq('id', bdeId);

      if (error) throw new Error(`Failed to delete BDE: ${error.message}`);
      return true;
    } catch (err) {
      throw new Error(`BDE deletion error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Check if university already has a BDE
   */
  async universiteHasBde(universiteId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('bde')
        .select('id')
        .eq('universite_id', universiteId)
        .eq('statut', 'actif')
        .limit(1);

      if (error) throw new Error(`Check failed: ${error.message}`);
      return data && data.length > 0;
    } catch (err) {
      throw new Error(`Check error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
