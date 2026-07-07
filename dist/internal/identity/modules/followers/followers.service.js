"use strict";
/**
 * Service pour la gestion des followers (utilisateurs qui suivent universités ou centres).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowersService = void 0;
class FollowersService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    /**
     * Suivre une université
     */
    async followUniversite(userId, universiteId) {
        // Vérifier que l'université existe et est approuvée
        const { data: universite, error: uniError } = await this.supabase
            .from('universites')
            .select('id, statut')
            .eq('id', universiteId)
            .eq('statut', 'APPROVED')
            .single();
        if (uniError || !universite) {
            throw new Error('Université not found or not approved');
        }
        // Ajouter le follower (ou ignorer si existe déjà grâce à UNIQUE constraint)
        const { data, error } = await this.supabase
            .from('followers_universites')
            .insert({
            user_id: userId,
            universite_id: universiteId,
        })
            .select('*')
            .single();
        if (error) {
            // Si c'est une violation de contrainte unique, c'est OK - l'utilisateur suit déjà
            if (error.code === '23505') {
                return { id: '', user_id: userId, universite_id: universiteId, date_follow: new Date().toISOString() };
            }
            throw new Error(`Failed to follow université: ${error.message}`);
        }
        return data;
    }
    /**
     * Arrêter de suivre une université
     */
    async unfollowUniversite(userId, universiteId) {
        const { error } = await this.supabase
            .from('followers_universites')
            .delete()
            .eq('user_id', userId)
            .eq('universite_id', universiteId);
        if (error) {
            throw new Error(`Failed to unfollow université: ${error.message}`);
        }
    }
    /**
     * Vérifier si l'utilisateur suit une université
     */
    async isFollowingUniversite(userId, universiteId) {
        const { data, error } = await this.supabase
            .from('followers_universites')
            .select('id')
            .eq('user_id', userId)
            .eq('universite_id', universiteId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to check follow status: ${error.message}`);
        }
        return !!data;
    }
    /**
     * Récupérer la liste des universités suivies par l'utilisateur
     */
    async getFollowedUniversites(userId) {
        const { data, error } = await this.supabase
            .from('followers_universites')
            .select(`
        id,
        date_follow,
        universite_id,
        universites:universite_id (
          id,
          nom,
          description,
          logo_url,
          lien_site,
          email,
          statut,
          date_creation
        )
      `)
            .eq('user_id', userId)
            .order('date_follow', { ascending: false });
        if (error) {
            throw new Error(`Failed to get followed universités: ${error.message}`);
        }
        return (data || []).map((item) => ({
            followId: item.id,
            dateFollow: item.date_follow,
            universite: item.universites,
        }));
    }
    /**
     * Suivre un centre de formation
     */
    async followCentre(userId, centreId) {
        // Vérifier que le centre existe et est approuvé
        const { data: centre, error: centreError } = await this.supabase
            .from('centres_formation')
            .select('id, statut')
            .eq('id', centreId)
            .eq('statut', 'APPROVED')
            .single();
        if (centreError || !centre) {
            throw new Error('Centre de formation not found or not approved');
        }
        // Ajouter le follower
        const { data, error } = await this.supabase
            .from('followers_centres_formation')
            .insert({
            user_id: userId,
            centre_id: centreId,
        })
            .select('*')
            .single();
        if (error) {
            if (error.code === '23505') {
                return { id: '', user_id: userId, centre_id: centreId, date_follow: new Date().toISOString() };
            }
            throw new Error(`Failed to follow centre: ${error.message}`);
        }
        return data;
    }
    /**
     * Arrêter de suivre un centre de formation
     */
    async unfollowCentre(userId, centreId) {
        const { error } = await this.supabase
            .from('followers_centres_formation')
            .delete()
            .eq('user_id', userId)
            .eq('centre_id', centreId);
        if (error) {
            throw new Error(`Failed to unfollow centre: ${error.message}`);
        }
    }
    /**
     * Vérifier si l'utilisateur suit un centre de formation
     */
    async isFollowingCentre(userId, centreId) {
        const { data, error } = await this.supabase
            .from('followers_centres_formation')
            .select('id')
            .eq('user_id', userId)
            .eq('centre_id', centreId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to check follow status: ${error.message}`);
        }
        return !!data;
    }
    /**
     * Récupérer la liste des centres de formation suivis par l'utilisateur
     */
    async getFollowedCentres(userId) {
        const { data, error } = await this.supabase
            .from('followers_centres_formation')
            .select(`
        id,
        date_follow,
        centre_id,
        centres_formation:centre_id (
          id,
          nom,
          description,
          logo_url,
          lien_site,
          email,
          statut,
          date_creation
        )
      `)
            .eq('user_id', userId)
            .order('date_follow', { ascending: false });
        if (error) {
            throw new Error(`Failed to get followed centres: ${error.message}`);
        }
        return (data || []).map((item) => ({
            followId: item.id,
            dateFollow: item.date_follow,
            centre: item.centres_formation,
        }));
    }
    /**
     * Compter les followers d'une université
     */
    async countUniversiteFollowers(universiteId) {
        console.debug('[followers/count] universite query', {
            table: 'followers_universites',
            filter: { universite_id: universiteId },
        });
        const { count, error } = await this.supabase
            .from('followers_universites')
            .select('*', { count: 'exact', head: true })
            .eq('universite_id', universiteId);
        if (error) {
            throw new Error(`Failed to count followers: ${error.message}`);
        }
        const normalizedCount = count || 0;
        console.debug('[followers/count] universite count returned', {
            universiteId,
            count: normalizedCount,
        });
        return normalizedCount;
    }
    /**
     * Compter les followers d'un centre de formation
     */
    async countCentreFollowers(centreId) {
        console.debug('[followers/count] centre query', {
            table: 'followers_centres_formation',
            filter: { centre_id: centreId },
        });
        const { count, error } = await this.supabase
            .from('followers_centres_formation')
            .select('*', { count: 'exact', head: true })
            .eq('centre_id', centreId);
        if (error) {
            throw new Error(`Failed to count followers: ${error.message}`);
        }
        const normalizedCount = count || 0;
        console.debug('[followers/count] centre count returned', {
            centreId,
            count: normalizedCount,
        });
        return normalizedCount;
    }
}
exports.FollowersService = FollowersService;
