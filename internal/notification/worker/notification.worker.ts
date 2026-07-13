import admin from 'firebase-admin';
import path from 'path';
import { JobScheduler, Queue, Worker } from 'bullmq';
import { getRedisConnectionOptions } from '../../shared/cache/redis';
import { getSupabaseClient } from '../../shared/database/supabase';

const QUEUE_NAME = process.env.NOTIFICATION_QUEUE_NAME || 'notification-push-queue';
const FAILED_QUEUE_NAME = process.env.FAILED_NOTIFICATION_QUEUE_NAME || 'failed-notification-push-queue';

const loadServiceAccountJson = (): admin.ServiceAccount | null => {
  const rawEnv = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (rawEnv) {
    try {
      const parsed = JSON.parse(rawEnv) as admin.ServiceAccount & { private_key?: string };
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (error) {
      console.error('Failed to parse FCM_SERVICE_ACCOUNT_JSON', error);
      return null;
    }
  }

  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const candidatePaths = [
    configuredPath,
    path.resolve(process.cwd(), 'internal/notification/universearch-af5a4-firebase-adminsdk-fbsvc-bb57157828.json'),
    path.resolve(process.cwd(), 'universearch-af5a4-firebase-adminsdk-fbsvc-bb57157828.json'),
  ].filter((value): value is string => Boolean(value));

  for (const candidatePath of candidatePaths) {
    try {
      return require(candidatePath) as admin.ServiceAccount;
    } catch {
      continue;
    }
  }

  return null;
};

const initializeFirebase = () => {
  if (admin.apps.length > 0) return admin.messaging();

  const serviceAccount = loadServiceAccountJson();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: (serviceAccount as any).project_id || process.env.FCM_PROJECT_ID,
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FCM_PROJECT_ID,
    });
  }

  return admin.messaging();
};

const stringifyPushData = (data: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
  );
};

const sendPush = async (notification: any, userId: string) => {
  const messaging = initializeFirebase();
  if (!messaging) throw new Error('Firebase messaging unavailable');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('provider', 'fcm')
    .is('disabled_at', null);
  if (error) throw error;

  const tokens = Array.from(new Set((data ?? []).map((row: any) => {
    const token = String(row.token || '');
    return token;
  }).filter(Boolean)));
  if (tokens.length === 0) {
    return { success: 0, failed: 0 };
  }

  const notificationData = normalizeMap(notification.data);
  const messageData = {
    ...stringifyPushData(notificationData),
    notification_id: String(notification.id ?? ''),
    type: notification.type ?? '',
    campaign_type: notification.campaign_type ?? '',
  };

  const batchSize = Number(process.env.FCM_BATCH_SIZE || 50);
  const removableErrors = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/mismatched-credential',
  ];

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (token) => {
        try {
          const msg: admin.messaging.Message = {
            token,
            notification: {
              title: notification.title || defaultTitle(notification.type),
              body: notification.message,
              imageUrl: process.env.FCM_NOTIFICATION_IMAGE_URL || undefined,
            },
            data: messageData as { [k: string]: string },
            android: {
              priority: 'high',
              notification: {
                imageUrl: process.env.FCM_NOTIFICATION_IMAGE_URL || undefined,
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: notification.silent ? undefined : 'default',
                  contentAvailable: notification.silent || undefined,
                },
              },
            },
          };

          await messaging.send(msg);
          return { success: true, token };
        } catch (err: any) {
          const code = err?.code || err?.errorInfo?.code || '';
          const shouldRemove = removableErrors.includes(code) || String(err).includes('Requested entity was not found');
          if (shouldRemove) {
            try {
              await supabase.from('device_tokens').delete().eq('token', token);
            } catch (deleteError) {
              console.warn('Failed to remove invalid token', token, deleteError);
            }
          }
          return { success: false, token, error: err };
        }
      })
    );

    successCount += results.filter((item) => item.success).length;
    failureCount += results.filter((item) => !item.success).length;
    if (process.env.FCM_THROTTLE_MS) {
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.FCM_THROTTLE_MS)));
    }
  }

  return { success: successCount, failed: failureCount };
};

const normalizeMap = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const defaultTitle = (type?: string) => {
  switch (type) {
    case 'like':
      return 'Nouveau like';
    case 'comment':
      return 'Nouveau commentaire';
    case 'orientation':
      return 'Nouvelle orientation';
    case 'inbox':
      return 'Nouveau message';
    case 'post':
      return 'Nouveau post';
    default:
      return 'Nouvelle notification';
  }
};

const scheduler = new JobScheduler(QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
});

const failedQueue = new Queue(FAILED_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { notification_id, user_id } = job.data as { notification_id: string; user_id: string };
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('notifications').select('*').eq('id', notification_id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Notification not found: ${notification_id}`);

    const result = await sendPush(data, user_id);
    return result;
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 25),
  }
);

worker.on('completed', (job) => {
  console.log(`Notification job completed: ${job.id}`);
});

worker.on('failed', async (job, err) => {
  const jobId = job?.id ?? '<unknown>';
  console.error(`Notification job failed: ${jobId}`, err);
  const attempts = job?.opts.attempts ?? 0;
  const attemptsMade = job?.attemptsMade ?? 0;
  if (attempts > 0 && attemptsMade >= attempts && job) {
    try {
      await failedQueue.add(job.name, job.data, {
        jobId: String(job.id),
        removeOnComplete: true,
        removeOnFail: false,
      });
      console.log(`Moved job ${job.id} to dead letter queue ${FAILED_QUEUE_NAME}`);
    } catch (moveError) {
      console.error('Failed to move job to dead letter queue', moveError);
    }
  }
});

worker.on('error', (err) => {
  console.error('Notification worker error:', err);
});

scheduler.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
  console.error('QueueScheduler failed job', jobId, failedReason);
});

console.log(`Notification worker started on queue ${QUEUE_NAME}`);
