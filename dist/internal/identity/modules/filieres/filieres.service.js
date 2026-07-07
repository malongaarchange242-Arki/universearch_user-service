"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilieresService = void 0;
class FilieresService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async listAll() {
        const { data, error } = await this.supabase
            .from('filieres')
            .select('id, nom, domaine_id')
            .order('nom', { ascending: true });
        if (error)
            throw new Error(`Failed to list filieres: ${error.message}`);
        return data || [];
    }
    async listDomainesWithFilieres() {
        // Fetch domaines and filieres and group by domaine.nom
        const { data: domaines, error: dErr } = await this.supabase
            .from('domaines')
            .select('id, nom')
            .order('nom', { ascending: true });
        if (dErr)
            throw new Error(`Failed to list domaines: ${dErr.message}`);
        const { data: filieres, error: fErr } = await this.supabase
            .from('filieres')
            .select('id, nom, domaine_id')
            .order('nom', { ascending: true });
        if (fErr)
            throw new Error(`Failed to list filieres: ${fErr.message}`);
        const map = {};
        const domainesById = {};
        (domaines || []).forEach((d) => { domainesById[d.id] = d.nom; map[d.nom] = []; });
        // put filieres into their domain; use 'Autres' for null domain
        (filieres || []).forEach((f) => {
            const key = f.domaine_id ? (domainesById[f.domaine_id] || 'Autres') : 'Autres';
            if (!map[key])
                map[key] = [];
            map[key].push(f.nom);
        });
        return map;
    }
}
exports.FilieresService = FilieresService;
