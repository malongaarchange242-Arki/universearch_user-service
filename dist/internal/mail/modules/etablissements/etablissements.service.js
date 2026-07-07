"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEtablissements = getEtablissements;
async function getEtablissements(app) {
    try {
        const supabase = app.supabase;
        // Récupérer les universités
        const { data: universites, error: univError } = await supabase
            .from('universites')
            .select('id, nom, email, description, contacts, lien_site, logo_url');
        if (univError) {
            console.error('Error fetching universites:', univError);
        }
        // Récupérer les centres de formation
        const { data: centres, error: centreError } = await supabase
            .from('centres_formation')
            .select('id, nom, email, description, contacts, lien_site, logo_url');
        if (centreError) {
            console.error('Error fetching centres_formation:', centreError);
        }
        return {
            universites: universites || [],
            centres: centres || [],
            total: (universites?.length || 0) + (centres?.length || 0),
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error in getEtablissements:', error);
        throw error;
    }
}
