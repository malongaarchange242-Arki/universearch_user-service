"use strict";
/**
 * Service for managing Frais de Scolarité (Tuition Fees)
 * Handles database operations and business logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraisScolariteService = void 0;
class FraisScolariteService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    /**
     * Get all frais for a specific university
     */
    async getFraisByUniversiteId(universite_id, filters) {
        try {
            let query = this.supabase
                .from('frais_scolarite')
                .select('*')
                .eq('universite_id', universite_id)
                .order('level', { ascending: true })
                .order('pole', { ascending: true });
            // Apply optional filters
            if (filters?.level) {
                query = query.eq('level', filters.level);
            }
            if (filters?.pole) {
                query = query.eq('pole', filters.pole);
            }
            const { data, error } = await query;
            if (error) {
                throw new Error(`Failed to fetch frais: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get a specific frais entry by ID
     */
    async getFraisById(id) {
        try {
            const { data, error } = await this.supabase
                .from('frais_scolarite')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows returned
                throw new Error(`Failed to fetch frais: ${error.message}`);
            }
            return data || null;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Create or update frais for a university (upsert operation)
     * This will insert new records and update existing ones based on unique constraint
     */
    async upsertFrais(universite_id, records) {
        try {
            // Prepare records with universite_id and currency
            const mutableRecords = records.map((record) => ({
                universite_id,
                level: record.level,
                pole: record.pole,
                monthly_price: record.monthly_price,
                yearly_price: record.yearly_price,
                currency: 'XAF',
            }));
            // First, delete existing records for this university to ensure clean state
            await this.supabase
                .from('frais_scolarite')
                .delete()
                .eq('universite_id', universite_id);
            // Then insert all new records
            const { data, error } = await this.supabase
                .from('frais_scolarite')
                .insert(mutableRecords)
                .select();
            if (error) {
                throw new Error(`Failed to upsert frais: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Update a specific frais entry
     */
    async updateFrais(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('frais_scolarite')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to update frais: ${error.message}`);
            }
            if (!data) {
                throw new Error('Frais not found');
            }
            return data;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Delete a specific frais entry
     */
    async deleteFrais(id) {
        try {
            const { error } = await this.supabase
                .from('frais_scolarite')
                .delete()
                .eq('id', id);
            if (error) {
                throw new Error(`Failed to delete frais: ${error.message}`);
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Delete all frais for a university
     */
    async deleteFraisByUniversiteId(universite_id) {
        try {
            const { count, error } = await this.supabase
                .from('frais_scolarite')
                .delete()
                .eq('universite_id', universite_id);
            if (error) {
                throw new Error(`Failed to delete frais: ${error.message}`);
            }
            return count || 0;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Check if university has any frais defined
     */
    async hasFraisDefined(universite_id) {
        try {
            const { count, error } = await this.supabase
                .from('frais_scolarite')
                .select('id', { count: 'exact', head: true })
                .eq('universite_id', universite_id);
            if (error) {
                throw new Error(`Failed to check frais: ${error.message}`);
            }
            return (count || 0) > 0;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get statistics about frais for a university
     */
    async getFraisStatistics(universite_id) {
        try {
            const { data, error } = await this.supabase
                .from('frais_scolarite')
                .select('monthly_price')
                .eq('universite_id', universite_id);
            if (error) {
                throw new Error(`Failed to get frais statistics: ${error.message}`);
            }
            const prices = (data || []).map((d) => d.monthly_price);
            if (prices.length === 0) {
                return {
                    total_count: 0,
                    min_monthly: 0,
                    max_monthly: 0,
                    avg_monthly: 0,
                };
            }
            return {
                total_count: prices.length,
                min_monthly: Math.min(...prices),
                max_monthly: Math.max(...prices),
                avg_monthly: prices.reduce((a, b) => a + b, 0) / prices.length,
            };
        }
        catch (error) {
            throw error;
        }
    }
}
exports.FraisScolariteService = FraisScolariteService;
