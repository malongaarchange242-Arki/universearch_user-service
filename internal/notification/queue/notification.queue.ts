import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../../shared/cache/redis';

const QUEUE_NAME = process.env.NOTIFICATION_QUEUE_NAME || 'notification-push-queue';

export const createNotificationQueue = (): Queue => {
  return new Queue(QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: Number(process.env.NOTIFICATION_JOB_ATTEMPTS || 5),
      backoff: {
        type: 'exponential',
        delay: Number(process.env.NOTIFICATION_JOB_BACKOFF_MS || 3000),
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
};

export const getNotificationQueueName = (): string => QUEUE_NAME;
