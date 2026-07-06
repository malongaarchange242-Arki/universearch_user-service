import { FastifyInstance } from 'fastify';
import { createMailer } from '../../config/mailer';
import { SendRecommendationEmailPayload } from './recommendation-mails.schemas';

type AppInstance = FastifyInstance & {
  supabase: any;
  mailer: any | null;
};

type InstitutionContact = {
  id: string;
  name: string;
  type: 'universite' | 'centre';
  email: string | null;
  contacts: string | null;
};

type DeliveryResult = {
  target_id: string;
  target_name: string;
  target_type: 'universite' | 'centre';
  email: string | null;
  status: 'sent' | 'skipped' | 'failed';
  message: string;
};

const extractEmailFromText = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
};

const splitCandidateName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const buildWorkbookBuffer = async (payload: SendRecommendationEmailPayload): Promise<Buffer> => {
  // Lazy require so startup doesn't fail before npm install is run in this service.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Universearch mail-service';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Candidat recommande');
  worksheet.columns = [
    { header: 'Nom', key: 'last_name', width: 28 },
    { header: 'Prenom', key: 'first_name', width: 28 },
    { header: 'Telephone', key: 'telephone', width: 20 },
    { header: 'Type utilisateur', key: 'user_type', width: 18 },
    { header: 'Email', key: 'email', width: 34 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E7FF' },
  };

  const fallbackNames = splitCandidateName(payload.candidate.full_name);
  worksheet.addRow({
    last_name: payload.candidate.last_name || fallbackNames.lastName || payload.candidate.full_name,
    first_name: payload.candidate.first_name || fallbackNames.firstName || '',
    telephone: payload.candidate.telephone || '',
    user_type: payload.candidate.user_type || '',
    email: payload.candidate.email || '',
  });

  worksheet.addRow({});
  worksheet.addRow({ last_name: 'Session', first_name: payload.candidate.session_id || '' });
  worksheet.addRow({ last_name: 'Raison', first_name: payload.candidate.reason || '' });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const fetchInstitutionContacts = async (
  fastify: FastifyInstance,
  payload: SendRecommendationEmailPayload
): Promise<InstitutionContact[]> => {
  const app = fastify as AppInstance;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const universiteIds = payload.institutions
    .filter((item) => item.target_type === 'universite')
    .map((item) => item.target_id);
  const centreIds = payload.institutions
    .filter((item) => item.target_type === 'centre')
    .map((item) => item.target_id);

  const contacts: InstitutionContact[] = [];

  if (universiteIds.length > 0) {
    const { data, error } = await app.supabase
      .from('universites')
      .select('id, nom, email, contacts')
      .in('id', universiteIds);

    if (error) {
      if (isDevelopment) {
        console.warn(`⚠️  Development mode: Could not fetch universities from DB: ${error.message}`);
      } else {
        throw new Error(`Failed to fetch universities: ${error.message}`);
      }
    }

    if (data && data.length > 0) {
      contacts.push(
        ...(data || []).map((item: any) => ({
          id: String(item.id),
          name: String(item.nom || 'Université'),
          type: 'universite' as const,
          email: item.email ? String(item.email) : null,
          contacts: item.contacts ? String(item.contacts) : null,
        }))
      );
    } else if (isDevelopment) {
      // In development, create mock universities with generated emails
      console.warn(`⚠️  Development mode: No universities found in DB, using mock data`);
      payload.institutions
        .filter((item) => item.target_type === 'universite')
        .forEach((item) => {
          const mockEmail = `contact-${item.target_id}@universite-dev.local`;
          contacts.push({
            id: item.target_id,
            name: item.target_name,
            type: 'universite' as const,
            email: mockEmail,
            contacts: null,
          });
        });
    }
  }

  if (centreIds.length > 0) {
    const { data, error } = await app.supabase
      .from('centres_formation')
      .select('id, nom, email, contacts')
      .in('id', centreIds);

    if (error) {
      if (isDevelopment) {
        console.warn(`⚠️  Development mode: Could not fetch centres from DB: ${error.message}`);
      } else {
        throw new Error(`Failed to fetch centres: ${error.message}`);
      }
    }

    if (data && data.length > 0) {
      contacts.push(
        ...(data || []).map((item: any) => ({
          id: String(item.id),
          name: String(item.nom || 'Centre de formation'),
          type: 'centre' as const,
          email: item.email ? String(item.email) : null,
          contacts: item.contacts ? String(item.contacts) : null,
        }))
      );
    } else if (isDevelopment) {
      // In development, create mock centres with generated emails
      console.warn(`⚠️  Development mode: No centres found in DB, using mock data`);
      payload.institutions
        .filter((item) => item.target_type === 'centre')
        .forEach((item) => {
          const mockEmail = `contact-${item.target_id}@centre-dev.local`;
          contacts.push({
            id: item.target_id,
            name: item.target_name,
            type: 'centre' as const,
            email: mockEmail,
            contacts: null,
          });
        });
    }
  }

  return contacts;
};

const buildEmailHtml = (
  payload: SendRecommendationEmailPayload,
  institution: InstitutionContact,
  selectedInstitutionCount: number
): string => {
  const fallbackNames = splitCandidateName(payload.candidate.full_name);
  const prenom = payload.candidate.first_name || fallbackNames.firstName || 'Candidat';
  const nom = payload.candidate.last_name || fallbackNames.lastName || payload.candidate.full_name;
  const customMessage = payload.custom_message?.trim();

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Nouveau candidat recommande</h2>
      <p>Bonjour ${institution.name},</p>
      <p>
        Universearch vous transmet le profil d'un candidat recommande pour votre etablissement.
        Cette notification fait partie d'un envoi vers ${selectedInstitutionCount} etablissement(s) selectionne(s).
      </p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px; font-weight: bold;">Nom</td><td style="padding: 6px 12px;">${nom}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">Prenom</td><td style="padding: 6px 12px;">${prenom}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">Telephone</td><td style="padding: 6px 12px;">${payload.candidate.telephone || 'Non renseigne'}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">Type utilisateur</td><td style="padding: 6px 12px;">${payload.candidate.user_type || 'Non renseigne'}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">Email</td><td style="padding: 6px 12px;">${payload.candidate.email || 'Non renseigne'}</td></tr>
      </table>
      <p><strong>Justification orientation:</strong> ${payload.candidate.reason || 'Aucune raison fournie.'}</p>
      ${customMessage ? `<p><strong>Message complementaire:</strong> ${customMessage}</p>` : ''}
      <p>Le fichier Excel joint reprend les informations essentielles du candidat.</p>
      <p>Cordialement,<br/>Equipe Universearch</p>
    </div>
  `;
};

export const sendRecommendationEmails = async (
  fastify: FastifyInstance,
  payload: SendRecommendationEmailPayload
): Promise<{ attachmentFileName: string; results: DeliveryResult[] }> => {
  const app = fastify as AppInstance;
  if (!app.mailer) {
    app.mailer = createMailer();
  }

  // Enrich candidate with profile data if quartier is missing
  let enrichedPayload = { ...payload };
  if (!payload.candidate.quartier && payload.candidate.email) {
    try {
      const { data: profile, error } = await app.supabase
        .from('profiles')
        .select('quartier')
        .eq('email', payload.candidate.email)
        .single();

      if (!error && profile?.quartier) {
        enrichedPayload.candidate = {
          ...enrichedPayload.candidate,
          quartier: profile.quartier,
        };
        console.log(`✅ Enriched candidate with quartier: ${profile.quartier}`);
      } else if (error) {
        console.warn(`⚠️ Could not enrich candidate with quartier: ${error.message}`);
      }
    } catch (exception) {
      console.warn('Exception while enriching candidate:', exception);
    }
  }

  const workbookBuffer = await buildWorkbookBuffer(enrichedPayload);
  const contacts = await fetchInstitutionContacts(app, enrichedPayload);
  const contactsById = new Map(contacts.map((item) => [`${item.type}:${item.id}`, item]));

  const fallbackNames = splitCandidateName(enrichedPayload.candidate.full_name);
  const safeFirstName = (enrichedPayload.candidate.first_name || fallbackNames.firstName || 'candidat')
    .replace(/[^a-z0-9]+/gi, '_')
    .toLowerCase();
  const safeLastName = (enrichedPayload.candidate.last_name || fallbackNames.lastName || 'recommande')
    .replace(/[^a-z0-9]+/gi, '_')
    .toLowerCase();
  const attachmentFileName = `candidat_${safeFirstName}_${safeLastName}.xlsx`;
  const from = process.env.SMTP_FROM || 'Universearch <no-reply@universearch.com>';

  const results: DeliveryResult[] = [];

  for (const institution of enrichedPayload.institutions) {
    const key = `${institution.target_type}:${institution.target_id}`;
    const contact = contactsById.get(key);
    const email = contact?.email || extractEmailFromText(contact?.contacts) || null;

    if (!contact) {
      results.push({
        target_id: institution.target_id,
        target_name: institution.target_name,
        target_type: institution.target_type,
        email: null,
        status: 'skipped',
        message: 'Institution not found in database',
      });
      continue;
    }

    if (!email) {
      results.push({
        target_id: institution.target_id,
        target_name: institution.target_name,
        target_type: institution.target_type,
        email: null,
        status: 'skipped',
        message: 'No institution email available',
      });
      continue;
    }

    const mailOptions = {
      from,
      to: email,
      subject: `Universearch - Candidat recommande pour ${contact.name}`,
      html: buildEmailHtml(enrichedPayload, contact, enrichedPayload.institutions.length),
      attachments: [
        {
          filename: attachmentFileName,
          content: workbookBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };

    try {
      const mailResult = await app.mailer.sendMail(mailOptions);
      
      // Log email send to database
      try {
        const fallbackNames = splitCandidateName(enrichedPayload.candidate.full_name);
        const { error: logError } = await app.supabase
          .from('email_logs')
          .insert([
            {
              nom: enrichedPayload.candidate.last_name || fallbackNames.lastName || null,
              prenom: enrichedPayload.candidate.first_name || fallbackNames.firstName || null,
              email: enrichedPayload.candidate.email || null,
              telephone: enrichedPayload.candidate.telephone || null,
              quartier: enrichedPayload.candidate.quartier || null,
              user_type: enrichedPayload.candidate.user_type || null,
              raison: enrichedPayload.candidate.reason || null,
              custom_message: enrichedPayload.custom_message || null,
              institution_name: institution.target_name,
              institution_id: institution.target_id,
              institution_type: institution.target_type,
              status: 'sent',
              message_id: mailResult?.messageId || null,
              brevo_response: mailResult?.response || null,
              admin_email: enrichedPayload.requested_by?.admin_email || null,
              admin_name: enrichedPayload.requested_by?.admin_name || null,
            },
          ]);

        if (logError) {
          console.warn('Failed to log email send:', logError);
        } else {
          console.log(`📊 Logged email send for ${enrichedPayload.candidate.email} to ${institution.target_name}`);
        }
      } catch (logException) {
        console.warn('Exception while logging email:', logException);
      }

      results.push({
        target_id: institution.target_id,
        target_name: institution.target_name,
        target_type: institution.target_type,
        email,
        status: 'sent',
        message: 'Email sent successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mailer error';
      console.error('Mail send failed', {
        target_id: institution.target_id,
        target_name: institution.target_name,
        target_type: institution.target_type,
        email,
        error: message,
      });
      results.push({
        target_id: institution.target_id,
        target_name: institution.target_name,
        target_type: institution.target_type,
        email,
        status: 'failed',
        message,
      });
    }
  }

  return {
    attachmentFileName,
    results,
  };
};
