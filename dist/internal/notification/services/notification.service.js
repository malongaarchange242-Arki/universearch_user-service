"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const normalizeMap = (value) => {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
};
const normalizeNotification = (attrs) => {
    const type = attrs.type;
    return {
        ...attrs,
        title: attrs.title ?? defaultTitle(type),
        priority: attrs.priority ?? 'high',
        campaign_type: attrs.campaign_type ?? 'transactional',
        silent: attrs.silent ?? false,
        delivery_types: Array.from(new Set(attrs.delivery_types ?? ['in_app', 'push'])),
        data: normalizeMap(attrs.data),
    };
};
const defaultTitle = (type) => {
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
const parseServiceAccountJson = (value) => {
    const raw = value.trim().replace(/^['"]|['"]$/g, '');
    try {
        return JSON.parse(raw.replace(/\\n/g, '\n'));
    }
    catch {
        return null;
    }
};
const getFirebaseMessaging = () => {
    if (firebase_admin_1.default.apps.length > 0) {
        return firebase_admin_1.default.messaging();
    }
    const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON
        ? parseServiceAccountJson(process.env.FCM_SERVICE_ACCOUNT_JSON)
        : null;
    const hasGoogleCreds = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
    if (!serviceAccountJson && !hasGoogleCreds) {
        return null;
    }
    const credential = serviceAccountJson
        ? firebase_admin_1.default.credential.cert(serviceAccountJson)
        : firebase_admin_1.default.credential.applicationDefault();
    firebase_admin_1.default.initializeApp({
        credential,
        projectId: process.env.FCM_PROJECT_ID,
    });
    return firebase_admin_1.default.messaging();
};
const stringifyPushData = (data) => {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
};
class NotificationService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async create(attrs) {
        const payload = normalizeNotification(attrs);
        if (!payload.user_id || !payload.type || !payload.message) {
            throw Object.assign(new Error('user_id, type and message are required'), { statusCode: 422 });
        }
        const { data, error } = await this.supabase.from('notifications').insert([payload]).select().single();
        if (error)
            throw Object.assign(new Error(error.message), { statusCode: 422 });
        if (payload.user_id && payload.delivery_types.includes('push')) {
            try {
                await this.sendPushNotification(data, String(payload.user_id));
            }
            catch (error) {
                console.warn('Unable to send FCM push for notification', {
                    user_id: payload.user_id,
                    notification_id: data?.id,
                    error,
                });
            }
        }
        await this.incrementUnread(String(payload.user_id));
        return data;
    }
    async broadcast(attrs) {
        const recipients = await this.resolveRecipients(attrs);
        if (recipients.length === 0) {
            throw Object.assign(new Error('No recipients found for notification'), { statusCode: 422 });
        }
        const notifications = [];
        const errors = [];
        for (const userId of recipients) {
            try {
                notifications.push(await this.create({ ...attrs, user_id: userId, user_ids: undefined, targeting: undefined }));
            }
            catch (error) {
                errors.push({ user_id: userId, error: error instanceof Error ? error.message : String(error) });
            }
        }
        return { notifications, errors, count: notifications.length };
    }
    async list(userId) {
        const { data, error } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('inserted_at', { ascending: false });
        if (error)
            throw error;
        return data ?? [];
    }
    async unreadCount(userId) {
        const { data, error } = await this.supabase
            .from('user_notification_stats')
            .select('unread_count')
            .eq('user_id', userId)
            .maybeSingle();
        if (error)
            throw error;
        return data?.unread_count ?? 0;
    }
    async markAsRead(notificationId, userId) {
        const notification = await this.getOwnedNotification(notificationId, userId);
        if (!notification)
            throw Object.assign(new Error('Notification not found'), { statusCode: 422 });
        const { data, error } = await this.supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw Object.assign(new Error(error.message), { statusCode: 422 });
        if (!notification.read)
            await this.incrementUnread(userId, -1);
        return data;
    }
    async delete(notificationId, userId) {
        const notification = await this.getNotification(notificationId);
        if (!notification)
            throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
        if (notification.user_id !== userId)
            throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
        const { data, error } = await this.supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .select()
            .single();
        if (error)
            throw Object.assign(new Error(error.message), { statusCode: 422 });
        if (!notification.read)
            await this.incrementUnread(userId, -1);
        return data;
    }
    async deleteAll(userId) {
        const unread = await this.unreadCount(userId);
        const { data, error } = await this.supabase.from('notifications').delete().eq('user_id', userId).select('id');
        if (error)
            throw error;
        if (unread > 0) {
            await this.supabase.from('user_notification_stats').upsert({ user_id: userId, unread_count: 0 });
        }
        return data?.length ?? 0;
    }
    async registerDevice(userId, attrs) {
        if (!attrs.token || !attrs.platform) {
            throw Object.assign(new Error('token and platform are required'), { statusCode: 422 });
        }
        const payload = {
            ...attrs,
            user_id: userId,
            provider: attrs.provider ?? 'fcm',
            interests: attrs.interests ?? [],
            metadata: normalizeMap(attrs.metadata),
            last_seen_at: new Date().toISOString(),
            disabled_at: null,
            failure_count: 0,
            last_error: null,
        };
        const { data, error } = await this.supabase
            .from('device_tokens')
            .upsert([payload], { onConflict: 'token' })
            .select()
            .single();
        if (error)
            throw Object.assign(new Error(error.message), { statusCode: 422 });
        return data;
    }
    async trackEvent(notificationId, userId, eventType, metadata, token) {
        if (!['delivered', 'opened', 'clicked'].includes(eventType)) {
            throw Object.assign(new Error('Unsupported event type'), { statusCode: 422 });
        }
        const notification = await this.getNotification(notificationId);
        if (!notification)
            throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
        if (notification.user_id !== userId)
            throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
        const deviceTokenId = token ? await this.findDeviceTokenId(userId, token) : null;
        const { data, error } = await this.supabase
            .from('notification_events')
            .insert([
            {
                notification_id: notificationId,
                device_token_id: deviceTokenId,
                user_id: userId,
                event_type: eventType,
                channel: 'push',
                provider: 'fcm_v1',
                status: 'success',
                metadata,
            },
        ])
            .select()
            .single();
        if (error)
            throw Object.assign(new Error(error.message), { statusCode: 422 });
        return data;
    }
    async analytics(notificationId, userId) {
        const notification = await this.getNotification(notificationId);
        if (!notification)
            throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
        if (notification.user_id !== userId)
            throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
        const { data, error } = await this.supabase
            .from('notification_events')
            .select('event_type')
            .eq('notification_id', notificationId);
        if (error)
            throw error;
        const counts = (data ?? []).reduce((acc, event) => {
            acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
            return acc;
        }, {});
        const queued = counts.queued ?? 0;
        const sent = counts.sent ?? 0;
        const delivered = counts.delivered ?? 0;
        const opened = counts.opened ?? 0;
        const clicked = counts.clicked ?? 0;
        const failed = (counts.failed ?? 0) + (counts.token_invalid ?? 0);
        return {
            queued,
            sent,
            delivered,
            opened,
            clicked,
            failed,
            delivery_rate: ratio(delivered, Math.max(sent, queued)),
            open_rate: ratio(opened, Math.max(delivered, sent)),
            ctr: ratio(clicked, Math.max(delivered, sent)),
        };
    }
    async resolveRecipients(attrs) {
        if (attrs.user_ids?.length)
            return Array.from(new Set(attrs.user_ids.map(String)));
        if (attrs.user_id)
            return [String(attrs.user_id)];
        const targeting = normalizeMap(attrs.targeting);
        let query = this.supabase.from('device_tokens').select('user_id').is('disabled_at', null);
        if (targeting.user_type)
            query = query.eq('user_type', String(targeting.user_type));
        if (Array.isArray(targeting.platforms) && targeting.platforms.length > 0) {
            query = query.in('platform', targeting.platforms.map(String));
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return Array.from(new Set((data ?? []).map((row) => String(row.user_id))));
    }
    async getNotification(notificationId) {
        const { data, error } = await this.supabase.from('notifications').select('*').eq('id', notificationId).maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async getOwnedNotification(notificationId, userId) {
        const { data, error } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('id', notificationId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async sendPushNotification(notification, userId) {
        const messaging = getFirebaseMessaging();
        if (!messaging) {
            return;
        }
        const { data, error } = await this.supabase
            .from('device_tokens')
            .select('token')
            .eq('user_id', userId)
            .eq('provider', 'fcm')
            .is('disabled_at', null);
        if (error)
            throw error;
        const tokens = Array.from(new Set((data ?? [])
            .map((row) => String(row.token || ''))
            .filter(Boolean)));
        if (tokens.length === 0) {
            return;
        }
        const notificationData = normalizeMap(notification.data);
        const messageData = {
            ...stringifyPushData(notificationData),
            notification_id: String(notification.id ?? ''),
            type: notification.type ?? '',
            campaign_type: notification.campaign_type ?? '',
        };
        const multicastMessage = {
            tokens,
            notification: {
                title: notification.title || defaultTitle(notification.type),
                body: notification.message,
                imageUrl: process.env.FCM_NOTIFICATION_IMAGE_URL || undefined,
            },
            data: messageData,
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
        const response = await messaging.sendMulticast(multicastMessage);
        if (response.failureCount > 0) {
            const failures = response.responses
                .map((resp, index) => (resp.success ? null : `token[${index}]: ${resp.error?.code || resp.error?.message || 'unknown'}`))
                .filter(Boolean);
            if (failures.length > 0) {
                throw new Error(`FCM multicast failures: ${failures.join('; ')}`);
            }
        }
    }
    async findDeviceTokenId(userId, token) {
        const { data, error } = await this.supabase
            .from('device_tokens')
            .select('id')
            .eq('user_id', userId)
            .eq('token', token)
            .maybeSingle();
        if (error)
            throw error;
        return data?.id ?? null;
    }
    async incrementUnread(userId, delta = 1) {
        const current = await this.unreadCount(userId);
        const next = Math.max(0, current + delta);
        await this.supabase.from('user_notification_stats').upsert({ user_id: userId, unread_count: next });
    }
}
exports.NotificationService = NotificationService;
const ratio = (value, denominator) => (denominator === 0 ? 0 : Number((value / denominator).toFixed(4)));
