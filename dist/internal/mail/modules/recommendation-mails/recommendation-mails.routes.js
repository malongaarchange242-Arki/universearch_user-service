"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationMailRoutes = void 0;
const recommendation_mails_schemas_1 = require("./recommendation-mails.schemas");
const recommendation_mails_service_1 = require("./recommendation-mails.service");
const recommendationMailRoutes = async (app) => {
    app.post('/recommendations/send', async (request, reply) => {
        const parsed = recommendation_mails_schemas_1.sendRecommendationEmailSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                error: 'Invalid payload',
                details: parsed.error.flatten(),
            });
        }
        const payload = parsed.data;
        const delivery = await (0, recommendation_mails_service_1.sendRecommendationEmails)(app, payload);
        const sentCount = delivery.results.filter((item) => item.status === 'sent').length;
        const failedCount = delivery.results.filter((item) => item.status === 'failed').length;
        const skippedCount = delivery.results.filter((item) => item.status === 'skipped').length;
        return reply.send({
            success: failedCount === 0,
            summary: {
                requested: payload.institutions.length,
                sent: sentCount,
                failed: failedCount,
                skipped: skippedCount,
            },
            attachment_file_name: delivery.attachmentFileName,
            results: delivery.results,
        });
    });
    // New endpoint to retrieve email logs
    app.get('/logs', async (request, reply) => {
        const appInstance = app;
        const limit = Math.min(parseInt(request.query.limit || '50'), 500);
        const offset = parseInt(request.query.offset || '0');
        const status = request.query.status;
        const institution = request.query.institution;
        try {
            let query = appInstance.supabase
                .from('email_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (status) {
                query = query.eq('status', status);
            }
            if (institution) {
                query = query.ilike('institution_name', `%${institution}%`);
            }
            const { data, error, count } = await query;
            if (error) {
                return reply.status(500).send({
                    success: false,
                    error: error.message,
                });
            }
            return reply.send({
                success: true,
                data: data || [],
                total: count || 0,
                limit,
                offset,
            });
        }
        catch (exception) {
            return reply.status(500).send({
                success: false,
                error: exception instanceof Error ? exception.message : 'Unknown error',
            });
        }
    });
    // Endpoint to get email logs statistics
    app.get('/logs/stats', async (request, reply) => {
        const appInstance = app;
        try {
            // Total logs
            const { count: totalCount } = await appInstance.supabase
                .from('email_logs')
                .select('*', { count: 'exact', head: true });
            // Count by status
            const { data: statusData } = await appInstance.supabase
                .from('email_logs')
                .select('status')
                .then(async (result) => {
                if (result.error)
                    throw result.error;
                const grouped = (result.data || []).reduce((acc, item) => {
                    acc[item.status] = (acc[item.status] || 0) + 1;
                    return acc;
                }, {});
                return { data: grouped };
            });
            // Count by institution
            const { data: institutionData } = await appInstance.supabase
                .from('email_logs')
                .select('institution_name')
                .then(async (result) => {
                if (result.error)
                    throw result.error;
                const grouped = (result.data || []).reduce((acc, item) => {
                    const name = item.institution_name || 'Unknown';
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {});
                return { data: grouped };
            });
            return reply.send({
                success: true,
                total: totalCount || 0,
                by_status: statusData || {},
                by_institution: institutionData || {},
            });
        }
        catch (exception) {
            return reply.status(500).send({
                success: false,
                error: exception instanceof Error ? exception.message : 'Unknown error',
            });
        }
    });
};
exports.recommendationMailRoutes = recommendationMailRoutes;
