import IORedis, { Redis, RedisOptions } from 'ioredis';

let redisClient: Redis | null = null;

const getRedisUrl = (): string => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = process.env.REDIS_PORT || '6379';
  return `redis://${host}:${port}`;
};

export const getRedisConnectionOptions = (): RedisOptions => {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL } as RedisOptions;
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
  } as RedisOptions;
};

export const getRedisClient = async (): Promise<Redis> => {
  if (redisClient) return redisClient;

  const connectionOptions = getRedisConnectionOptions();
  redisClient = new IORedis(connectionOptions);

  redisClient.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  return redisClient;
};

export const closeRedisClient = async (): Promise<void> => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch (error) {
    console.warn('Error closing Redis client:', error);
  } finally {
    redisClient = null;
  }
};
