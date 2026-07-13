"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisClient = exports.getRedisClient = exports.getRedisConnectionOptions = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
const getRedisUrl = () => {
    if (process.env.REDIS_URL)
        return process.env.REDIS_URL;
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = process.env.REDIS_PORT || '6379';
    return `redis://${host}:${port}`;
};
const getRedisConnectionOptions = () => {
    if (process.env.REDIS_URL) {
        return { url: process.env.REDIS_URL };
    }
    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
    };
};
exports.getRedisConnectionOptions = getRedisConnectionOptions;
const getRedisClient = async () => {
    if (redisClient)
        return redisClient;
    const connectionOptions = (0, exports.getRedisConnectionOptions)();
    redisClient = new ioredis_1.default(connectionOptions);
    redisClient.on('error', (error) => {
        console.error('Redis connection error:', error);
    });
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const closeRedisClient = async () => {
    if (!redisClient)
        return;
    try {
        await redisClient.quit();
    }
    catch (error) {
        console.warn('Error closing Redis client:', error);
    }
    finally {
        redisClient = null;
    }
};
exports.closeRedisClient = closeRedisClient;
