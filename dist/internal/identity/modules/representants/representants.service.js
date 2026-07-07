"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepresentantService = void 0;
class RepresentantService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    /**
     * Create a new representant for a centre de formation
     * Linked to the centre's profile (profile_id)
     */
    async createRepresentant(data, profileId) {
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
            if (error)
                throw new Error(`Failed to create representant: ${error.message}`);
            return rep;
        }
        catch (err) {
            throw new Error(`Representant creation error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /**
     * Get representant by ID
     */
    async getRepresentantById(repId) {
        try {
            const { data, error } = await this.supabase
                .from('representants')
                .select('*')
                .eq('id', repId)
                .single();
            if (error && error.code !== 'PGRST116') {
                throw new Error(`Failed to fetch representant: ${error.message}`);
            }
            return data || null;
        }
        catch (err) {
            throw new Error(`Representant fetch error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /**
     * Get all representants for a centre de formation
     * A centre can have multiple representants (e.g., director, manager, etc.)
     */
    async getRepresentantsByCentreId(centreId) {
        try {
            const { data, error } = await this.supabase
                .from('representants')
                .select('*')
                .eq('centre_id', centreId)
                .eq('statut', 'actif')
                .order('date_creation', { ascending: false });
            if (error)
                throw new Error(`Failed to fetch representants: ${error.message}`);
            return data || [];
        }
        catch (err) {
            throw new Error(`Representants fetch error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /**
     * Update representant information
     */
    async updateRepresentant(repId, data) {
        try {
            const updatePayload = {};
            if (data.fonction !== undefined)
                updatePayload.fonction = data.fonction;
            if (data.statut !== undefined)
                updatePayload.statut = data.statut;
            const { data: updated, error } = await this.supabase
                .from('representants')
                .update(updatePayload)
                .eq('id', repId)
                .select()
                .single();
            if (error)
                throw new Error(`Failed to update representant: ${error.message}`);
            return updated;
        }
        catch (err) {
            throw new Error(`Representant update error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /**
     * Delete representant (soft delete by changing status)
     */
    async deleteRepresentant(repId) {
        try {
            const { error } = await this.supabase
                .from('representants')
                .update({ statut: 'inactif' })
                .eq('id', repId);
            if (error)
                throw new Error(`Failed to delete representant: ${error.message}`);
            return true;
        }
        catch (err) {
            throw new Error(`Representant deletion error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /**
     * Count active representants for a centre
     */
    async countActiveByCentreId(centreId) {
        try {
            const { data, error } = await this.supabase
                .from('representants')
                .select('id', { count: 'exact' })
                .eq('centre_id', centreId)
                .eq('statut', 'actif');
            if (error)
                throw new Error(`Count failed: ${error.message}`);
            return data?.length || 0;
        }
        catch (err) {
            throw new Error(`Count error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
exports.RepresentantService = RepresentantService;
