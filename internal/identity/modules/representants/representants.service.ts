import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateRepresentantDto {
  nom?: string;
  fonction?: string;
  description?: string | null;
  logo_url?: string | null;
  video_url?: string | null;
  pres_lastname?: string | null;
  pres_firstname?: string | null;
  pres_phone?: string | null;
  pres_email?: string | null;
  centre_id?: string;
}

export interface UpdateRepresentantDto {
  fonction?: string;
  statut?: 'actif' | 'inactif' | 'suspendu';
}

export interface RepresentantEntity {
  id: string;
  centre_id: string;
  profile_id: string;
  fonction: string;
  statut: 'actif' | 'inactif' | 'suspendu';
  date_creation: string;
}

export class RepresentantService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new representant for a centre de formation
   * Linked to the centre's profile (profile_id)
   */
  async createRepresentant(
    data: CreateRepresentantDto,
    profileId: string,
  ): Promise<RepresentantEntity> {
    try {
      const { data: rep, error } = await this.supabase
        .from('representants')
        .insert({
          centre_id: profileId,
          profile_id: profileId,
          nom: data.nom || null,
          fonction: data.fonction || 'Représentant',
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

      if (error) throw new Error(`Failed to create representant: ${error.message}`);
      return rep as RepresentantEntity;
    } catch (err) {
      throw new Error(
        `Representant creation error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get representant by ID
   */
  async getRepresentantById(repId: string): Promise<RepresentantEntity | null> {
    try {
      const { data, error } = await this.supabase
        .from('representants')
        .select('*')
        .eq('id', repId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch representant: ${error.message}`);
      }
      return (data as RepresentantEntity) || null;
    } catch (err) {
      throw new Error(
        `Representant fetch error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get all representants for a centre de formation
   * A centre can have multiple representants (e.g., director, manager, etc.)
   */
  async getRepresentantsByCentreId(centreId: string): Promise<RepresentantEntity[]> {
    try {
      const { data, error } = await this.supabase
        .from('representants')
        .select('*')
        .eq('centre_id', centreId)
        .eq('statut', 'actif')
        .order('date_creation', { ascending: false });

      if (error) throw new Error(`Failed to fetch representants: ${error.message}`);
      return (data as RepresentantEntity[]) || [];
    } catch (err) {
      throw new Error(
        `Representants fetch error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Update representant information
   */
  async updateRepresentant(
    repId: string,
    data: UpdateRepresentantDto,
  ): Promise<RepresentantEntity> {
    try {
      const updatePayload: Record<string, any> = {};
      if (data.fonction !== undefined) updatePayload.fonction = data.fonction;
      if (data.statut !== undefined) updatePayload.statut = data.statut;

      const { data: updated, error } = await this.supabase
        .from('representants')
        .update(updatePayload)
        .eq('id', repId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update representant: ${error.message}`);
      return updated as RepresentantEntity;
    } catch (err) {
      throw new Error(
        `Representant update error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Delete representant (soft delete by changing status)
   */
  async deleteRepresentant(repId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('representants')
        .update({ statut: 'inactif' })
        .eq('id', repId);

      if (error) throw new Error(`Failed to delete representant: ${error.message}`);
      return true;
    } catch (err) {
      throw new Error(
        `Representant deletion error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Count active representants for a centre
   */
  async countActiveByCentreId(centreId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('representants')
        .select('id', { count: 'exact' })
        .eq('centre_id', centreId)
        .eq('statut', 'actif');

      if (error) throw new Error(`Count failed: ${error.message}`);
      return data?.length || 0;
    } catch (err) {
      throw new Error(
        `Count error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
