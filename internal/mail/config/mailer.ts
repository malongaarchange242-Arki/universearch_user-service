const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

const getEnv = (names: string[], fallback?: string): string | undefined => {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== '') return value;
  }
  return fallback;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createBrevoMailer = ({ brevoApiKey, from }: { brevoApiKey: string; from: string }) => {
  const BREVO_FALLBACK_SENDER = getEnv(['BREVO_FALLBACK_SENDER']);

  const parseAddress = (value: string | string[]) => {
    if (typeof value === 'string') {
      return [{ email: value }];
    }
    return value.map((address) => ({ email: address }));
  };

  const parseSender = () => {
    // If a fallback sender is configured (for testing), use it
    if (BREVO_FALLBACK_SENDER) {
      console.log('⚠️  Using BREVO_FALLBACK_SENDER for testing');
      return { email: BREVO_FALLBACK_SENDER };
    }

    const match = from.match(/^(.*)<([^>]+)>$/);
    if (!match) {
      return { email: from };
    }
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  };

  const toBase64 = (content: unknown) => {
    if (Buffer.isBuffer(content)) return content.toString('base64');
    if (typeof content === 'string') return Buffer.from(content).toString('base64');
    throw new Error('Unsupported attachment content type for Brevo API');
  };

  return {
    sendMail: async (mailOptions: any) => {
      const parsedSender = parseSender();
      console.log('📧 Brevo sender details:');
      console.log('   FROM (raw):', from);
      console.log('   Parsed sender:', JSON.stringify(parsedSender));

      const payload: any = {
        sender: parsedSender,
        to: parseAddress(mailOptions.to),
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
      };

      if (mailOptions.cc) payload.cc = parseAddress(mailOptions.cc);
      if (mailOptions.bcc) payload.bcc = parseAddress(mailOptions.bcc);
      if (mailOptions.text) payload.textContent = mailOptions.text;
      if (mailOptions.replyTo) payload.replyTo = { email: mailOptions.replyTo };

      if (mailOptions.attachments?.length) {
        payload.attachment = mailOptions.attachments.map((attachment: any) => ({
          name: attachment.filename,
          content: toBase64(attachment.content),
          type: attachment.contentType || 'application/octet-stream',
        }));
      }

      console.log('📧 Brevo payload (sender only):', JSON.stringify({ sender: payload.sender, to: payload.to?.length }, null, 2));

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.text();
      let json: any;
      try {
        json = JSON.parse(body);
      } catch {
        json = null;
      }

      console.log('📧 Brevo response:');
      console.log('   Status:', response.status);
      console.log('   Body:', body);
      console.log('   To (recipients):', JSON.stringify(payload.to));
      console.log('   Subject:', payload.subject);

      if (!response.ok) {
        throw new Error(`Brevo API error ${response.status}: ${json?.message || response.statusText || body}`);
      }

      return {
        messageId: json?.messageId || '',
        response: `Brevo API ${response.status}`,
      };
    },
  };
};

const createSmtpMailer = ({
  nodemailer,
  host,
  port,
  secure,
  user,
  pass,
  connectionTimeout,
  greetingTimeout,
  socketTimeout,
}: {
  nodemailer: any;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
}) => {
  const buildTransportOptions = (smtpPort: number, smtpSecure: boolean) => ({
    host,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user,
      pass,
    },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    requireTLS: parseBoolean(getEnv(['SMTP_REQUIRE_TLS', 'EMAIL_SMTP_REQUIRE_TLS']), true),
    tls: {
      rejectUnauthorized: false,
    },
  });

  const transportOptionsList = [
    buildTransportOptions(port, secure),
    buildTransportOptions(port === 465 ? 587 : 465, port === 465 ? false : true),
  ].filter((option, index, options) => options.findIndex((candidate) => candidate.port === option.port && candidate.secure === option.secure) === index);

  let cachedTransport: any | null = null;

  const getWorkingSmtpTransport = async () => {
    if (cachedTransport) return cachedTransport;

    let lastError: unknown;
    for (const transportOptions of transportOptionsList) {
      const transporter = nodemailer.createTransport(transportOptions);
      try {
        await transporter.verify();
        cachedTransport = transporter;
        console.log(`📧 SMTP connection verified via ${transportOptions.host}:${transportOptions.port} secure=${transportOptions.secure}`);
        return transporter;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ SMTP verification failed for ${transportOptions.host}:${transportOptions.port} secure=${transportOptions.secure}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('SMTP verification failed');
  };

  return {
    sendMail: async (mailOptions: any) => {
      const transporter = await getWorkingSmtpTransport();
      return transporter.sendMail(mailOptions);
    },
  };
};

export const createMailer = () => {
  // Lazy require so the service can compile even before local npm install is done.
  // The dependency is still required at runtime for actual email sending.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');

  const host = getEnv(['SMTP_HOST', 'EMAIL_SMTP_HOST']);
  const port = parseNumber(getEnv(['SMTP_PORT', 'EMAIL_SMTP_PORT']), 587);
  const secure = parseBoolean(getEnv(['SMTP_SECURE', 'EMAIL_SMTP_SECURE']), port === 465);
  const user = getEnv(['SMTP_USER', 'EMAIL_SMTP_USER']);
  const pass = getEnv(['SMTP_PASS', 'EMAIL_SMTP_PASS']);
  const brevoApiKey = getEnv(['BREVO_API_KEY', 'EMAIL_BREVO_API_KEY']);
  const from: string = getEnv(['SMTP_FROM', 'EMAIL_FROM'], 'Universearch <no-reply@universearch.com>') as string;
  const connectionTimeout = parseNumber(getEnv(['SMTP_CONNECTION_TIMEOUT', 'EMAIL_SMTP_CONNECTION_TIMEOUT']), 60000);
  const greetingTimeout = parseNumber(getEnv(['SMTP_GREETING_TIMEOUT', 'EMAIL_SMTP_GREETING_TIMEOUT']), 60000);
  const socketTimeout = parseNumber(getEnv(['SMTP_SOCKET_TIMEOUT', 'EMAIL_SMTP_SOCKET_TIMEOUT']), 60000);
  const isDevelopment = process.env.NODE_ENV !== 'production';

  console.log(`🔑 BREVO_API_KEY present: ${Boolean(brevoApiKey)}`);

  if (brevoApiKey) {
    console.log('📧 Using Brevo API transport');
    return createBrevoMailer({ brevoApiKey, from });
  }

  // In development, allow placeholder credentials and use mock transporter
  if (!host || !user || !pass) {
    if (isDevelopment) {
      console.warn('⚠️  Development mode: Using mock email transporter');
      console.warn('   Emails will be logged but NOT sent');
      console.warn('   For production, set SMTP_HOST, SMTP_USER, SMTP_PASS');

      return {
        sendMail: async (mailOptions: any) => {
          console.log('\n📧 [MOCK EMAIL - DEV MODE]');
          console.log(`   To: ${mailOptions.to}`);
          console.log(`   Subject: ${mailOptions.subject}`);
          if (mailOptions.attachments?.length) {
            console.log(`   Attachments: ${mailOptions.attachments.length} file(s)`);
          }
          console.log(`   Time: ${new Date().toISOString()}`);
          console.log('   Status: Would be sent in production\n');

          return {
            messageId: `mock-${Date.now()}@dev.local`,
            response: 'Mock send - development mode only',
          };
        },
      };
    }

    throw new Error('Missing SMTP configuration in environment variables');
  }

  console.log(`📧 SMTP transporter configured: ${host}:${port} secure=${secure} timeouts=${connectionTimeout}/${greetingTimeout}/${socketTimeout}ms`);

  return createSmtpMailer({
    nodemailer,
    host,
    port,
    secure,
    user,
    pass,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
  });
};
