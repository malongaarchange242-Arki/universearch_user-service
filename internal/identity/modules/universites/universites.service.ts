/**
 * Service métier pour la gestion des universités.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface UniversiteRecord {
  id: string;
  profile_id: string;
  nom: string;
  nom_representant?: string | null;
  description?: string;
  sigle?: string;
  annee_fondation?: number;
  contacts?: string | null;
  email?: string;
  ville?: string | null;
  statut: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  logo_url?: string;
  couverture_logo_url?: string;
  lien_site?: string;
  primary_color?: string | null;
  domaine?: string;
  video_url?: string;
  date_creation: string;
  updated_at?: string;
  domaines?: Array<{
    nom: string;
    filieres: Array<{
      id: string;
      nom: string;
      nom_affiche?: string | null;
      niveau?: string | null;
      niveau_detail?: string | null;
      duree?: string | null;
      lieu?: string | null;
      langue?: string | null;
      frais_inscription?: string | null;
      frais_l1?: string | null;
      frais_l2?: string | null;
      frais_l3?: string | null;
      frais_m1?: string | null;
      frais_m2?: string | null;
      frais_m3?: string | null;
      description?: string | null;
      prerequis?: string | null;
      alternance?: boolean | null;
    }>;
  }>;
}

type FormationDetailsPayload = {
  filiere_id?: string;
  filiereId?: string;
  nom_affiche?: string | null;
  niveau?: string | null;
  niveau_detail?: string | null;
  duree?: string | null;
  lieu?: string | null;
  langue?: string | null;
  frais_inscription?: string | null;
  frais_l1?: string | null;
  frais_l2?: string | null;
  frais_l3?: string | null;
  frais_m1?: string | null;
  frais_m2?: string | null;
  frais_m3?: string | null;
  description?: string | null;
  prerequis?: string | null;
  alternance?: boolean | string | null;
};

function cleanFormationText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeFormationDetails(details?: FormationDetailsPayload) {
  if (!details) return {};

  let alternance: boolean | null = null;
  if (typeof details.alternance === 'boolean') {
    alternance = details.alternance;
  } else if (typeof details.alternance === 'string') {
    const value = details.alternance.trim().toLowerCase();
    alternance = ['oui', 'true', '1', 'yes'].includes(value);
  }

  return {
    nom_affiche: cleanFormationText(details.nom_affiche),
    niveau: cleanFormationText(details.niveau),
    niveau_detail: cleanFormationText(details.niveau_detail),
    duree: cleanFormationText(details.duree),
    lieu: cleanFormationText(details.lieu),
    langue: cleanFormationText(details.langue),
    frais_inscription: cleanFormationText(details.frais_inscription),
    frais_l1: cleanFormationText(details.frais_l1),
    frais_l2: cleanFormationText(details.frais_l2),
    frais_l3: cleanFormationText(details.frais_l3),
    frais_m1: cleanFormationText(details.frais_m1),
    frais_m2: cleanFormationText(details.frais_m2),
    frais_m3: cleanFormationText(details.frais_m3),
    description: cleanFormationText(details.description),
    prerequis: cleanFormationText(details.prerequis),
    alternance,
  };
}

export class UniversitesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new université (and profile record)
   */
  async createUniversite(payload: Partial<UniversiteRecord> & { telephone?: string }): Promise<UniversiteRecord> {
    const profileId = randomUUID();
    const uniId = randomUUID();

    // Insert profile
    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        id: profileId,
        nom: payload.nom ?? null,
        email: payload.email ?? null,
        telephone: (payload as any).telephone ?? null,
        profile_type: 'universite',
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    const { data, error } = await this.supabase
      .from('universites')
      .insert({
        id: uniId,
        profile_id: profileId,
        nom: payload.nom ?? null,
        nom_representant: (payload as any).nom_representant ?? null,
        description: payload.description ?? null,
        sigle: (payload as any).sigle ?? null,
        annee_fondation: (payload as any).annee_fondation ?? null,
        contacts: (payload as any).contacts ?? null,
        email: payload.email ?? null,
        ville: (payload as any).ville ?? null,
        statut: (payload.statut as any) ?? 'PENDING',
        logo_url: payload.logo_url ?? null,
        couverture_logo_url: payload.couverture_logo_url ?? null,
        lien_site: payload.lien_site ?? null,
        primary_color: (payload as any).primary_color ?? null,
        domaine: payload.domaine ?? null,
        video_url: payload.video_url ?? null,
        date_creation: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      // rollback profile
      await this.supabase.from('profiles').delete().eq('id', profileId);
      throw new Error(`Failed to create université: ${error.message}`);
    }

    return data as UniversiteRecord;
  }

  /**
   * Récupérer mon université (par profile_id de l'utilisateur connecté)
   */
  async getMyUniversite(userId: string): Promise<UniversiteRecord | null> {
    const { data, error } = await this.supabase
      .from('universites')
      .select('*')
      .eq('profile_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      throw new Error(`Failed to get my université: ${error.message}`);
    }

    if (!data) return null;

    // Add domaines and filieres
    return await this.addDomainesToUniversite(data);
  }

  /**
   * Récupérer une université par ID (pour accès public, seulement approuvées)
   */
  async getUniversiteById(id: string): Promise<UniversiteRecord | null> {
    const { data, error } = await this.supabase
      .from('universites')
      .select('*')
      .eq('id', id)
      .eq('statut', 'APPROVED')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      throw new Error(`Failed to get université: ${error.message}`);
    }

    if (!data) return null;

    // Add domaines and filieres
    return await this.addDomainesToUniversite(data);
  }

  /**
   * Mettre à jour mon université
   */
  async updateMyUniversite(
    userId: string,
    payload: Partial<UniversiteRecord> & {
      selectedFilieres?: string[];
      formationDetails?: FormationDetailsPayload[];
    }
  ): Promise<UniversiteRecord> {
    // Interdire la modification du statut via cette route
    const { statut, profile_id, id, date_creation, selectedFilieres, formationDetails, ...updateData } = payload as any;

    // If frontend sent selectedFilieres (array), persist as a comma-separated domaine (for backward compatibility)
    if (selectedFilieres && Array.isArray(selectedFilieres)) {
      updateData.domaine = selectedFilieres.join(', ');
    }

    const { data, error } = await this.supabase
      .from('universites')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', userId)
      .select('*');

    if (error) {
      throw new Error(`Failed to update my université: ${error.message}`);
    }

    let universite: UniversiteRecord;

    if (!data || data.length === 0) {
      // Université not found, create it
      const uniId = randomUUID();
      const insertPayload = {
        id: uniId,
        profile_id: userId,
        nom: updateData.nom || null,
        description: updateData.description || null,
        sigle: updateData.sigle || null,
        annee_fondation: updateData.annee_fondation || null,
        contacts: updateData.contacts || null,
        email: updateData.email || null,
        ville: updateData.ville || null,
        statut: 'PENDING',
        logo_url: updateData.logo_url || null,
        couverture_logo_url: updateData.couverture_logo_url || null,
      nom_representant: updateData.nom_representant || null,
      lien_site: updateData.lien_site || null,
        primary_color: updateData.primary_color || null,
        domaine: updateData.domaine || null,
        video_url: updateData.video_url || null,
        date_creation: new Date().toISOString(),
        ...updateData,
      };

      const { data: insertData, error: insertError } = await this.supabase
        .from('universites')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) {
        throw new Error(`Failed to create université: ${insertError.message}`);
      }

      universite = insertData;
    } else {
      universite = data[0];
    }

    // 🔥 NEW: If frontend sent selectedFilieres, now INSERT them into universite_filieres!
    if (selectedFilieres && Array.isArray(selectedFilieres) && selectedFilieres.length > 0) {
      try {
        console.log(`🔗 [DEBUG] Attaching ${selectedFilieres.length} filières to université ${universite.id}:`, selectedFilieres);
        // Pass filieres directly - attachFilieresToUniversite will validate them against filieres table
        const result = await this.attachFilieresToUniversite(
          universite.id,
          selectedFilieres,
          Array.isArray(formationDetails) ? formationDetails : []
        );
        console.log(`✅ [DEBUG] Filière attachment result:`, result);
      } catch (err) {
        console.warn(`Warning: Failed to attach filieres: ${(err as Error).message}`);
        // Don't throw - update was successful, just filiere attachment failed
      }
    }

    return universite;
  }

  /**
   * Helper method to add domaines and filieres to a universite record
   */
  private async addDomainesToUniversite(universite: any): Promise<UniversiteRecord> {
    // Get filieres for this universite
    const { data: filiereData, error: filError } = await this.supabase
      .from('universite_filieres')
      .select(`
        niveau,
        nom_affiche,
        niveau_detail,
        duree,
        lieu,
        langue,
        frais_inscription,
        frais_l1,
        frais_l2,
        frais_l3,
        frais_m1,
        frais_m2,
        frais_m3,
        description,
        prerequis,
        alternance,
        filieres!inner(
          id,
          nom,
          domaines!inner(
            nom
          )
        )
      `)
      .eq('universite_id', universite.id);

    if (filError) {
      throw new Error(`Failed to fetch filieres for universite: ${filError.message}`);
    }

    // Group filieres by domaine
    const domainesMap = new Map<string, { nom: string; filieres: Array<{
      id: string;
      nom: string;
      nom_affiche?: string | null;
      niveau?: string | null;
      niveau_detail?: string | null;
      duree?: string | null;
      lieu?: string | null;
      langue?: string | null;
      frais_inscription?: string | null;
      frais_l1?: string | null;
      frais_l2?: string | null;
      frais_l3?: string | null;
      frais_m1?: string | null;
      frais_m2?: string | null;
      frais_m3?: string | null;
      description?: string | null;
      prerequis?: string | null;
      alternance?: boolean | null;
    }> }>();

    (filiereData || []).forEach((row: any) => {
      if (row.filieres && row.filieres.domaines) {
        const domaineNom = row.filieres.domaines.nom;
        if (!domainesMap.has(domaineNom)) {
          domainesMap.set(domaineNom, { nom: domaineNom, filieres: [] });
        }
        domainesMap.get(domaineNom)!.filieres.push({
          id: row.filieres.id,
          nom: row.filieres.nom,
          nom_affiche: row.nom_affiche ?? null,
          niveau: row.niveau ?? null,
          niveau_detail: row.niveau_detail ?? null,
          duree: row.duree ?? null,
          lieu: row.lieu ?? null,
          langue: row.langue ?? null,
            frais_inscription: row.frais_inscription ?? null,
            frais_l1: row.frais_l1 ?? null,
            frais_l2: row.frais_l2 ?? null,
            frais_l3: row.frais_l3 ?? null,
            frais_m1: row.frais_m1 ?? null,
            frais_m2: row.frais_m2 ?? null,
            frais_m3: row.frais_m3 ?? null,
          description: row.description ?? null,
          prerequis: row.prerequis ?? null,
          alternance: row.alternance ?? null
        });
      }
    });

    // Sort filieres within each domaine
    Array.from(domainesMap.values()).forEach(domaine => {
      domaine.filieres.sort((a, b) => a.nom.localeCompare(b.nom));
    });

    return {
      id: universite.id,
      profile_id: universite.profile_id,
      nom: universite.nom,
      description: universite.description,
      sigle: universite.sigle,
      annee_fondation: universite.annee_fondation,
      contacts: universite.contacts,
      email: universite.email,
      ville: universite.ville,
      statut: universite.statut,
      logo_url: universite.logo_url,
      couverture_logo_url: universite.couverture_logo_url,
      lien_site: universite.lien_site,
      primary_color: universite.primary_color,
      domaine: universite.domaine,
      video_url: universite.video_url,
      date_creation: universite.date_creation,
      updated_at: universite.updated_at,
      domaines: Array.from(domainesMap.values()).sort((a, b) => a.nom.localeCompare(b.nom))
    };
  }

  /**
   * Lister toutes les universités approuvées avec leurs domaines et filières
   */
  async listApprovedUniversites(limit = 20, offset = 0): Promise<UniversiteRecord[]> {
    // Get the universites
    const { data: universites, error: uniError } = await this.supabase
      .from('universites')
      .select('*')
      .in('statut', ['APPROVED', 'PENDING'])
      .order('date_creation', { ascending: false })
      .range(offset, offset + limit - 1);

    if (uniError) {
      throw new Error(`Failed to list universités: ${uniError.message}`);
    }

    if (!universites || universites.length === 0) {
      return [];
    }

    // Add domaines to each universite
    const resultPromises = universites.map(universite => this.addDomainesToUniversite(universite));
    const result = await Promise.all(resultPromises);

    return result;
  }

  /**
   * Upload a logo for the caller's université and persist the public URL.
   * Accepts a Buffer containing image data.
   */
  async uploadLogoForMyUniversite(userId: string, buffer: Buffer, filename: string, contentType = 'image/png'): Promise<string> {
    // find universite by profile_id
    const { data: uni, error: uniErr } = await this.supabase
      .from('universites')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (uniErr || !uni) {
      throw new Error('Université not found for your account');
    }

    const uniId = (uni as any).id as string;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `logos/${uniId}/${Date.now()}_${safeName}`;

    // upload to storage
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('logos')
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      throw new Error(`Logo upload failed: ${uploadError.message}`);
    }

    // get public url (support multiple supabase client return shapes)
    const getUrlResult = this.supabase.storage.from('logos').getPublicUrl(uploadData.path as any);
    const publicURL = (getUrlResult as any)?.publicURL ?? (getUrlResult as any)?.data?.publicUrl ?? (getUrlResult as any)?.data?.publicURL ?? null;

    // persist to universites
    const { error: updateErr } = await this.supabase
      .from('universites')
      .update({ logo_url: publicURL, updated_at: new Date().toISOString() })
      .eq('id', uniId);

    if (updateErr) {
      throw new Error(`Failed to update universite logo: ${updateErr.message}`);
    }

    return publicURL;
  }

  /**
   * Attacher plusieurs filières à une université (par universiteId).
   * Accepte les UUIDs des filières et les insère dans universite_filieres.
   * Évite les doublons en vérifiant les associations existantes.
   */
  async attachFilieresToUniversite(
    universiteId: string,
    filiereIds: string[],
    formationDetails: FormationDetailsPayload[] = []
  ): Promise<{ inserted: number; updated: number; skipped: string[] }> {
    if (!Array.isArray(filiereIds) || filiereIds.length === 0) {
      return { inserted: 0, updated: 0, skipped: [] };
    }

    // Normalize and deduplicate incoming IDs
    const ids = Array.from(new Set(filiereIds.map(String)));
    const detailsByFiliereId = new Map<string, FormationDetailsPayload>();
    formationDetails.forEach((item) => {
      const filiereId = item?.filiere_id || item?.filiereId;
      if (filiereId) detailsByFiliereId.set(String(filiereId), item);
    });
    console.log(`🔗 [DEBUG] attachFilieresToUniversite called with ${ids.length} filières`);

    // 🔥 ÉTAPE 1: Valider que les filières existent en base
    console.log(`🔍 [DEBUG] Validating filieres against database...`);
    const { data: filieres, error: filieresErr } = await this.supabase
      .from('filieres')
      .select('id')
      .in('id', ids as any);

    if (filieresErr) {
      console.error(`❌ [DEBUG] Query failed:`, filieresErr.message);
      throw new Error(`Failed to validate filieres: ${filieresErr.message}`);
    }

    const validIds = (filieres || []).map((f: any) => f.id).filter(Boolean);
    console.log(`✅ [DEBUG] Found ${validIds.length} valid filieres out of ${ids.length}`);

    if (validIds.length === 0) {
      console.warn(`⚠️ [DEBUG] No valid filieres found for:`, ids);
      return { inserted: 0, updated: 0, skipped: ids };
    }

    // 🔥 ÉTAPE 2: Vérifier les associations existantes
    console.log(`🔄 [DEBUG] Checking existing associations for university ${universiteId}...`);
    const { data: existing, error: existingErr } = await this.supabase
      .from('universite_filieres')
      .select('filiere_id')
      .eq('universite_id', universiteId)
      .in('filiere_id', validIds as any);

    if (existingErr) {
      console.error(`❌ [DEBUG] Failed to check existing:`, existingErr.message);
      throw new Error(`Failed to check existing associations: ${existingErr.message}`);
    }

    const existingIds = new Set((existing || []).map((r: any) => r.filiere_id));
    const toUpdate = validIds.filter(id => existingIds.has(id) && detailsByFiliereId.has(id));
    let updated = 0;
    for (const filiereId of toUpdate) {
      const { error: updateErr } = await this.supabase
        .from('universite_filieres')
        .update({
          ...normalizeFormationDetails(detailsByFiliereId.get(filiereId)),
          updated_at: new Date().toISOString()
        })
        .eq('universite_id', universiteId)
        .eq('filiere_id', filiereId);

      if (updateErr) {
        throw new Error(`Failed to update universite_filieres: ${updateErr.message}`);
      }
      updated += 1;
    }
    console.log(`📊 [DEBUG] Found ${existingIds.size} existing associations`);

    // 🔥 ÉTAPE 3: Préparer les nouvelles associations
    const toInsert = validIds.filter(id => !existingIds.has(id));
    console.log(`➕ [DEBUG] Will insert ${toInsert.length} new associations`);

    if (toInsert.length === 0) {
      console.log(`ℹ️ [DEBUG] All filières were already associated`);
      return { inserted: 0, updated, skipped: validIds };
    }

    // 🔥 ÉTAPE 4: Insérer les lignes
    const rows = toInsert.map(filiereId => ({
      id: randomUUID(),
      universite_id: universiteId,
      filiere_id: filiereId,
      ...normalizeFormationDetails(detailsByFiliereId.get(filiereId)),
      created_at: new Date().toISOString()
    }));

    console.log(`💾 [DEBUG] Inserting ${rows.length} rows into universite_filieres`);

    const { error: insertErr } = await this.supabase
      .from('universite_filieres')
      .insert(rows);

    if (insertErr) {
      console.error(`❌ [DEBUG] Insert failed:`, insertErr.message);
      throw new Error(`Failed to insert universite_filieres: ${insertErr.message}`);
    }

    console.log(`✅ [DEBUG] Successfully inserted ${rows.length} associations`);
    return { inserted: rows.length, updated, skipped: Array.from(existingIds) };
  }

  /**
   * Attacher plusieurs filières à mon université (résout l'universite via profile_id)
   */
  async attachFilieresToMyUniversite(
    userId: string,
    filiereIds: string[],
    formationDetails: FormationDetailsPayload[] = []
  ) {
    console.log(`🔍 [DEBUG] attachFilieresToMyUniversite: resolving universite for profile_id=${userId}`);
    
    const { data: uni, error: uniErr } = await this.supabase
      .from('universites')
      .select('id')
      .eq('profile_id', userId)
      .single();
    
    console.log(`📊 [DEBUG] Supabase response: data=${JSON.stringify(uni)}, error=${uniErr?.message || 'none'}`);
    
    if (uniErr) {
      console.error(`❌ [DEBUG] Error querying universite: ${uniErr.message}`);
      throw new Error(`Error finding universe: ${uniErr.message}`);
    }
    
    if (!uni) {
      console.error(`❌ [DEBUG] No universite found for profile_id=${userId}`);
      throw new Error('Université not found for your account');
    }
    
    const uniId = (uni as any).id as string;
    console.log(`✅ [DEBUG] Resolved profile_id=${userId} → universite_id=${uniId}`);
    
    return this.attachFilieresToUniversite(uniId, filiereIds, formationDetails);
  }
}
