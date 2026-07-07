"use strict";
/**
 * Service métier pour la gestion des centres de formation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentresService = void 0;
const crypto_1 = require("crypto");
class CentresService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    /**
     * Create a new centre de formation (and profile record)
     */
    async createCentre(payload) {
        const profileId = (0, crypto_1.randomUUID)();
        const centreId = (0, crypto_1.randomUUID)();
        const { error: profileError } = await this.supabase
            .from('profiles')
            .insert({
            id: profileId,
            nom: payload.nom ?? null,
            email: payload.email ?? null,
            telephone: payload.telephone ?? null,
            profile_type: 'centre_formation',
            created_at: new Date().toISOString(),
        });
        if (profileError) {
            throw new Error(`Failed to create profile: ${profileError.message}`);
        }
        const { data, error } = await this.supabase
            .from('centres_formation')
            .insert({
            id: centreId,
            profile_id: profileId,
            nom: payload.nom ?? null,
            nom_representant: payload.nom_representant ?? null,
            description: payload.description ?? null,
            email: payload.email ?? null,
            contacts: payload.contacts ?? null,
            ville: payload.ville ?? null,
            statut: payload.statut ?? 'PENDING',
            logo_url: payload.logo_url ?? null,
            couverture_logo_url: payload.couverture_logo_url ?? null,
            lien_site: payload.lien_site ?? null,
            primary_color: payload.primary_color ?? null,
            video_url: payload.video_url ?? null,
            sigle: payload.sigle ?? null,
            annee_fondation: payload.annee_fondation ?? null,
            date_creation: new Date().toISOString(),
        })
            .select('*')
            .single();
        if (error) {
            // rollback profile
            await this.supabase.from('profiles').delete().eq('id', profileId);
            throw new Error(`Failed to create centre: ${error.message}`);
        }
        return data;
    }
    /**
     * Récupérer mon centre (par profile_id de l'utilisateur connecté)
     */
    async getMyCentre(userId) {
        const { data, error } = await this.supabase
            .from('centres_formation')
            .select(`
        *,
        centre_formation_filieres (
          filieres_centre (
            id,
            nom,
            domaines_centre (
              id,
              nom
            )
          )
        )
      `)
            .eq('profile_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') {
            // PGRST116 = not found
            throw new Error(`Failed to get my centre: ${error.message}`);
        }
        if (!data)
            return null;
        return this.processCentreWithDomaines(data);
    }
    /**
     * Process a centre record to add domaines and filieres
     */
    processCentreWithDomaines(centre) {
        const domaineMap = new Map();
        const centreFilieres = [];
        (centre.centre_formation_filieres || []).forEach((item) => {
            const filiere = item.filieres_centre;
            if (filiere && filiere.domaines_centre) {
                const domaine = filiere.domaines_centre;
                const domaineId = domaine.id;
                if (!domaineMap.has(domaineId)) {
                    domaineMap.set(domaineId, {
                        nom: domaine.nom,
                        filieres: []
                    });
                }
                domaineMap.get(domaineId).filieres.push({
                    id: filiere.id,
                    nom: filiere.nom
                });
            }
            centreFilieres.push({
                id: item.id,
                filiere_id: item.filiere_id || null,
                nom_formation: item.nom_formation || (filiere ? filiere.nom : null),
                categorie_domaine: item.categorie_domaine || null,
                type_certification: item.type_certification || null,
                duree: item.duree || null,
                cout_formation: item.cout_formation || null,
                lieu: item.lieu || null,
                mode_formation: item.mode_formation || null,
                langue: item.langue || 'Français',
                description: item.description || null,
                prerequis: item.prerequis || null,
                stage_alternance: item.stage_alternance,
                created_at: item.created_at,
                updated_at: item.updated_at
            });
        });
        centre.domaines = Array.from(domaineMap.values());
        centre.filieres = centreFilieres;
        // Remove the nested data to clean up the response
        delete centre.centre_formation_filieres;
        return centre;
    }
    /**
     * Lister toutes les filières centre
     */
    async listFilieresCentre() {
        const { data, error } = await this.supabase
            .from('filieres_centre')
            .select('id, nom, domaine_id')
            .order('nom');
        if (error) {
            throw new Error(`Failed to list filieres centre: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Mettre à jour mon centre
     */
    async updateMyCentre(userId, payload) {
        // Interdire la modification du statut via cette route
        const { statut, profile_id, id, date_creation, selectedFilieres, ...updateData } = payload;
        const { data, error } = await this.supabase
            .from('centres_formation')
            .update({
            ...updateData,
            updated_at: new Date().toISOString(),
        })
            .eq('profile_id', userId)
            .select('*');
        if (error) {
            throw new Error(`Failed to update my centre: ${error.message}`);
        }
        let centre;
        if (!data || data.length === 0) {
            // Centre not found, create it
            const centreId = (0, crypto_1.randomUUID)();
            const insertPayload = {
                id: centreId,
                profile_id: userId,
                nom: updateData.nom || null,
                description: updateData.description || null,
                email: updateData.email || null,
                contacts: updateData.contacts || null,
                ville: updateData.ville || null,
                statut: 'PENDING',
                logo_url: updateData.logo_url || null,
                couverture_logo_url: updateData.couverture_logo_url || null,
                lien_site: updateData.lien_site || null,
                nom_representant: updateData.nom_representant || null,
                primary_color: updateData.primary_color || null,
                video_url: updateData.video_url || null,
                sigle: updateData.sigle || null,
                annee_fondation: updateData.annee_fondation || null,
                date_creation: new Date().toISOString(),
                ...updateData,
            };
            const { data: insertData, error: insertError } = await this.supabase
                .from('centres_formation')
                .insert(insertPayload)
                .select('*')
                .single();
            if (insertError) {
                throw new Error(`Failed to create centre: ${insertError.message}`);
            }
            centre = insertData;
        }
        else {
            centre = data[0];
        }
        // Handle selectedFilieres: insert into centre_formation_filieres
        if (selectedFilieres && Array.isArray(selectedFilieres)) {
            // Delete existing
            await this.supabase
                .from('centre_formation_filieres')
                .delete()
                .eq('centre_formation_id', centre.id);
            // Insert new
            if (selectedFilieres.length > 0) {
                const inserts = selectedFilieres.map((filiereId) => ({
                    centre_formation_id: centre.id,
                    filiere_id: filiereId,
                }));
                // debug log to help troubleshoot why table might be empty
                console.log('Attempting to insert centre filieres for centre', centre.id, inserts);
                const { error: insertError } = await this.supabase
                    .from('centre_formation_filieres')
                    .insert(inserts);
                if (insertError) {
                    console.warn('Failed to insert centre filieres:', insertError, 'payload:', inserts);
                }
            }
        }
        return centre;
    }
    /**
     * Récupérer un centre par ID (info publiques, seulement si APPROVED)
     */
    async getCentreById(id) {
        const { data, error } = await this.supabase
            .from('centres_formation')
            .select(`
        *,
        centre_formation_filieres (
          filieres_centre (
            id,
            nom,
            domaines_centre (
              id,
              nom
            )
          )
        )
      `)
            .eq('id', id)
            .eq('statut', 'APPROVED') // Seulement les approuvés
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to get centre: ${error.message}`);
        }
        if (!data)
            return null;
        return this.processCentreWithDomaines(data);
    }
    /**
     * Lister tous les centres approuvés
     */
    async listApprovedCentres(limit = 20, offset = 0) {
        const { data, error } = await this.supabase
            .from('centres_formation')
            .select(`
        *,
        centre_formation_filieres (
          filieres_centre (
            id,
            nom,
            domaines_centre (
              id,
              nom
            )
          )
        )
      `)
            .in('statut', ['APPROVED', 'PENDING'])
            .order('date_creation', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new Error(`Failed to list centres: ${error.message}`);
        }
        // Process each centre to add domaines
        const centres = (data || []).map(centre => this.processCentreWithDomaines(centre));
        return centres;
    }
    /**
     * Upload a logo for the caller's centre and persist the public URL.
     * Accepts a Buffer containing image data.
     */
    async uploadLogoForMyCentre(userId, buffer, filename, contentType = 'image/png') {
        // find centre by profile_id
        const { data: centre, error: centreErr } = await this.supabase
            .from('centres_formation')
            .select('id')
            .eq('profile_id', userId)
            .single();
        if (centreErr || !centre) {
            throw new Error('Centre not found for your account');
        }
        const centreId = centre.id;
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `logos/${centreId}/${Date.now()}_${safeName}`;
        // upload to storage
        const { data: uploadData, error: uploadError } = await this.supabase.storage
            .from('logos')
            .upload(path, buffer, { contentType, upsert: false });
        if (uploadError) {
            throw new Error(`Logo upload failed: ${uploadError.message}`);
        }
        // get public url
        const getUrlResult = this.supabase.storage.from('logos').getPublicUrl(uploadData.path);
        const publicURL = getUrlResult?.publicURL ?? getUrlResult?.data?.publicUrl ?? getUrlResult?.data?.publicURL ?? null;
        // persist to centres_formation
        const { error: updateErr } = await this.supabase
            .from('centres_formation')
            .update({ logo_url: publicURL, updated_at: new Date().toISOString() })
            .eq('id', centreId);
        if (updateErr) {
            throw new Error(`Failed to update centre logo: ${updateErr.message}`);
        }
        return publicURL;
    }
    /**
     * Attacher les filières au centre de l'utilisateur connecté
     * POST /centres/me/filieres
     */
    async attachProfessionalFormationToMyCentre(userId, formationDetails = []) {
        // 1️⃣ Trouver le centre de l'utilisateur
        const { data: centre, error: centreErr } = await this.supabase
            .from('centres_formation')
            .select('id')
            .eq('profile_id', userId)
            .single();
        if (centreErr || !centre) {
            throw new Error('Centre not found for your account');
        }
        const centreId = centre.id;
        if (!Array.isArray(formationDetails) || formationDetails.length === 0) {
            return {
                inserted: 0,
                updated: 0,
                message: 'No formation details provided'
            };
        }
        let inserted = 0;
        let updated = 0;
        // 2️⃣ Traiter chaque formation professionnelle
        for (const formation of formationDetails) {
            if (!formation.nom_formation) {
                console.warn('Formation without nom_formation, skipping');
                continue;
            }
            // Determine filiere_id from payload or category/domain name
            let filiere_id = null;
            const candidateFiliereId = String(formation.filiere_id || '').trim();
            if (candidateFiliereId) {
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidPattern.test(candidateFiliereId)) {
                    filiere_id = candidateFiliereId;
                }
                else {
                    const normalizedSlug = candidateFiliereId.toLowerCase();
                    const { data: slugMatch, error: slugMatchErr } = await this.supabase
                        .from('filieres_centre')
                        .select('id')
                        .eq('nom_normalise', normalizedSlug)
                        .limit(1);
                    if (slugMatchErr) {
                        console.error('Error looking up filiere by slug:', slugMatchErr);
                    }
                    else if (Array.isArray(slugMatch) && slugMatch.length > 0) {
                        filiere_id = slugMatch[0].id;
                    }
                    else {
                        const { data: nameMatch, error: nameMatchErr } = await this.supabase
                            .from('filieres_centre')
                            .select('id')
                            .ilike('nom', candidateFiliereId)
                            .limit(1);
                        if (nameMatchErr) {
                            console.error('Error looking up filiere by name:', nameMatchErr);
                        }
                        else if (Array.isArray(nameMatch) && nameMatch.length > 0) {
                            filiere_id = nameMatch[0].id;
                        }
                    }
                }
            }
            const normalizedCategory = String(formation.categorie_domaine || '').trim();
            if (!filiere_id && normalizedCategory) {
                const categorySlug = normalizedCategory.toLowerCase().replace(/\s+/g, '-');
                const { data: categoryMatch, error: categoryMatchErr } = await this.supabase
                    .from('filieres_centre')
                    .select('id')
                    .eq('nom_normalise', categorySlug)
                    .limit(1);
                if (categoryMatchErr) {
                    console.error('Error looking up filiere by categorie_domaine slug:', categoryMatchErr);
                }
                else if (Array.isArray(categoryMatch) && categoryMatch.length > 0) {
                    filiere_id = categoryMatch[0].id;
                }
            }
            if (!filiere_id && normalizedCategory) {
                const { data: filiereMatch, error: filiereMatchErr } = await this.supabase
                    .from('filieres_centre')
                    .select('id')
                    .ilike('nom', normalizedCategory)
                    .limit(1);
                if (filiereMatchErr) {
                    console.error('Error looking up filiere by categorie_domaine name:', filiereMatchErr);
                }
                else if (Array.isArray(filiereMatch) && filiereMatch.length > 0) {
                    filiere_id = filiereMatch[0].id;
                }
            }
            if (!filiere_id && normalizedCategory) {
                const { data: insertedFiliere, error: insertFiliereErr } = await this.supabase
                    .from('filieres_centre')
                    .insert({ id: (0, crypto_1.randomUUID)(), nom: normalizedCategory })
                    .select('id')
                    .single();
                if (insertFiliereErr) {
                    console.error('Error creating new filiere_centre:', insertFiliereErr);
                }
                else {
                    filiere_id = insertedFiliere?.id || null;
                }
            }
            // Normaliser les données
            const normalizedFormation = {
                centre_formation_id: centreId,
                filiere_id: filiere_id || null,
                nom_formation: String(formation.nom_formation || '').trim(),
                categorie_domaine: normalizedCategory || null,
                type_certification: String(formation.type_certification || '').trim() || null,
                duree: String(formation.duree || '').trim() || null,
                cout_formation: String(formation.cout_formation || '').trim() || null,
                lieu: String(formation.lieu || '').trim() || null,
                mode_formation: String(formation.mode_formation || '').trim() || null,
                langue: String(formation.langue || 'Français').trim(),
                description: String(formation.description || '').trim() || null,
                prerequis: String(formation.prerequis || '').trim() || null,
                stage_alternance: typeof formation.stage_alternance === 'boolean'
                    ? formation.stage_alternance
                    : ['oui', 'true', '1', 'yes'].includes(String(formation.stage_alternance).toLowerCase()),
                updated_at: new Date().toISOString()
            };
            // 3️⃣ Vérifier si la formation existe déjà (par nom_formation)
            const { data: existing, error: checkErr } = await this.supabase
                .from('centre_formation_filieres')
                .select('id')
                .eq('centre_formation_id', centreId)
                .eq('nom_formation', normalizedFormation.nom_formation)
                .single();
            if (checkErr && checkErr.code !== 'PGRST116') {
                console.error('Error checking existing formation:', checkErr);
                continue;
            }
            if (existing) {
                // Mettre à jour
                const { error: updateErr } = await this.supabase
                    .from('centre_formation_filieres')
                    .update(normalizedFormation)
                    .eq('id', existing.id);
                if (updateErr) {
                    console.error('Error updating formation:', updateErr);
                    continue;
                }
                updated++;
            }
            else {
                // Insérer
                const { error: insertErr } = await this.supabase
                    .from('centre_formation_filieres')
                    .insert({
                    id: (0, crypto_1.randomUUID)(),
                    ...normalizedFormation,
                    created_at: new Date().toISOString()
                });
                if (insertErr) {
                    console.error('Error inserting formation:', insertErr);
                    continue;
                }
                inserted++;
            }
        }
        return {
            inserted,
            updated,
            message: `Successfully processed ${inserted} new and ${updated} updated professional formations`
        };
    }
}
exports.CentresService = CentresService;
