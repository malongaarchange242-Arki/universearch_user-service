import { FastifyInstance } from 'fastify';
import {
  sendRecommendationEmailSchema,
  SendRecommendationEmailPayload,
} from './recommendation-mails.schemas';
import { sendRecommendationEmails } from './recommendation-mails.service';

type AppInstance = FastifyInstance & {
  supabase: any;
};

export const recommendationMailRoutes = async (app: FastifyInstance) => {
  app.post('/recommendations/send', async (request, reply) => {
    const parsed = sendRecommendationEmailSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid payload',
        details: parsed.error.flatten(),
      });
    }

    const payload: SendRecommendationEmailPayload = parsed.data;
    const delivery = await sendRecommendationEmails(app, payload);

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
  app.get<{ Querystring: { limit?: string; offset?: string; status?: string; institution?: string } }>(
    '/logs',
    async (request, reply) => {
      const appInstance = app as AppInstance;
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
      } catch (exception) {
        return reply.status(500).send({
          success: false,
          error: exception instanceof Error ? exception.message : 'Unknown error',
        });
      }
    }
  );

  // Endpoint to get email logs statistics
  app.get('/logs/stats', async (request, reply) => {
    const appInstance = app as AppInstance;

    try {
      // Total logs
      const { count: totalCount } = await appInstance.supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true });

      // Count by status
      const { data: statusData } = await appInstance.supabase
        .from('email_logs')
        .select('status')
        .then(async (result: any) => {
          if (result.error) throw result.error;
          const grouped = (result.data || []).reduce((acc: any, item: any) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
          }, {});
          return { data: grouped };
        });

      // Count by institution
      const { data: institutionData } = await appInstance.supabase
        .from('email_logs')
        .select('institution_name')
        .then(async (result: any) => {
          if (result.error) throw result.error;
          const grouped = (result.data || []).reduce((acc: any, item: any) => {
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
    } catch (exception) {
      return reply.status(500).send({
        success: false,
        error: exception instanceof Error ? exception.message : 'Unknown error',
      });
    }
  });
};
