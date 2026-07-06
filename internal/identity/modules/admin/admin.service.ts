/**
 * Service métier pour les opérations d'administration.
 * Gère l'approbation/rejet d'universités et centres de formation.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface UniversiteRecord {
  id: string;
  nom: string;
  description?: string;
  email?: string;
  statut: 'PENDING' | 'APPROVED' | 'REJECTED';
  date_creation: string;
  updated_at?: string;
  profile_id: string;
}

export interface CentreFormationRecord {
  id: string;
  nom: string;
  description?: string;
  email?: string;
  statut: 'PENDING' | 'APPROVED' | 'REJECTED';
  date_creation: string;
  updated_at?: string;
  profile_id: string;
}

export class AdminService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retourne des statistiques agrégées pour le dashboard admin
   */
  async getDashboardStats(): Promise<any> {
    // Universités counts
    const totalUnisRes = await this.supabase.from('universites').select('*', { count: 'exact', head: true });
    if (totalUnisRes.error) throw new Error(totalUnisRes.error.message);
    const totalUnis = totalUnisRes.count ?? 0;

    const approvedUnisRes = await this.supabase.from('universites').select('*', { count: 'exact', head: true }).eq('statut', 'APPROVED');
    if (approvedUnisRes.error) throw new Error(approvedUnisRes.error.message);
    const approvedUnis = approvedUnisRes.count ?? 0;

    const pendingUnisRes = await this.supabase.from('universites').select('*', { count: 'exact', head: true }).eq('statut', 'PENDING');
    if (pendingUnisRes.error) throw new Error(pendingUnisRes.error.message);
    const pendingUnis = pendingUnisRes.count ?? 0;

    // Centres counts
    const totalCentresRes = await this.supabase.from('centres_formation').select('*', { count: 'exact', head: true });
    if (totalCentresRes.error) throw new Error(totalCentresRes.error.message);
    const totalCentres = totalCentresRes.count ?? 0;

    const approvedCentresRes = await this.supabase.from('centres_formation').select('*', { count: 'exact', head: true }).eq('statut', 'APPROVED');
    if (approvedCentresRes.error) throw new Error(approvedCentresRes.error.message);
    const approvedCentres = approvedCentresRes.count ?? 0;

    const pendingCentresRes = await this.supabase.from('centres_formation').select('*', { count: 'exact', head: true }).eq('statut', 'PENDING');
    if (pendingCentresRes.error) throw new Error(pendingCentresRes.error.message);
    const pendingCentres = pendingCentresRes.count ?? 0;

    // Utilisateurs (profiles)
    const usersRes = await this.supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (usersRes.error) throw new Error(usersRes.error.message);
    const usersTotal = usersRes.count ?? 0;

    return {
      universites: { total: totalUnis, approved: approvedUnis, pending: pendingUnis },
      centres: { total: totalCentres, approved: approvedCentres, pending: pendingCentres },
      utilisateurs: { total: usersTotal },
    };
  }

  /**
   * Approuver une université
   */
  async approveUniversite(id: string): Promise<UniversiteRecord> {
    return this.updateUniversiteStatus(id, 'APPROVED');
  }

  /**
   * Rejeter une université
   */
  async rejectUniversite(id: string, raison?: string): Promise<UniversiteRecord> {
    return this.updateUniversiteStatus(id, 'REJECTED', raison);
  }

  /**
   * Changer le statut d'une université (générique)
   */
  async updateUniversiteStatus(
    id: string,
    statut: 'PENDING' | 'APPROVED' | 'REJECTED',
    raison?: string
  ): Promise<UniversiteRecord> {
    const updatePayload: any = {
      statut,
      updated_at: new Date().toISOString(),
    };

    if (raison) {
      updatePayload.rejection_reason = raison;
    }

    const { data, error } = await this.supabase
      .from('universites')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update université id=${id}: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Université not found: ${id}`);
    }

    return data;
  }

  /**
   * Lister les universités en attente
   */
  async listPendingUniversites(limit = 20, offset = 0): Promise<UniversiteRecord[]> {
    const { data, error } = await this.supabase
      .from('universites')
      .select('*')
      .eq('statut', 'PENDING')
      .order('date_creation', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list pending universités: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Approuver un centre de formation
   */
  async approveCentre(id: string): Promise<CentreFormationRecord> {
    return this.updateCentreStatus(id, 'APPROVED');
  }

  /**
   * Rejeter un centre de formation
   */
  async rejectCentre(id: string, raison?: string): Promise<CentreFormationRecord> {
    return this.updateCentreStatus(id, 'REJECTED', raison);
  }

  /**
   * Changer le statut d'un centre de formation (générique)
   */
  async updateCentreStatus(
    id: string,
    statut: 'PENDING' | 'APPROVED' | 'REJECTED',
    raison?: string
  ): Promise<CentreFormationRecord> {
    const updatePayload: any = {
      statut,
      updated_at: new Date().toISOString(),
    };

    if (raison) {
      updatePayload.rejection_reason = raison;
    }
    const { data, error } = await this.supabase
      .from('centres_formation')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update centre id=${id}: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Centre not found: ${id}`);
    }

    return data;
  }

  /**
   * Lister les centres en attente
   */
  async listPendingCentres(limit = 20, offset = 0): Promise<CentreFormationRecord[]> {
    const { data, error } = await this.supabase
      .from('centres_formation')
      .select('*')
      .eq('statut', 'PENDING')
      .order('date_creation', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list pending centres: ${error.message}`);
    }

    return data || [];
  }
}
