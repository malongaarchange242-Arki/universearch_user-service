import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { DeviceTokenPayload, NotificationPayload } from '../models';

const normalizeMap = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const normalizeDeliveryTypes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim().toLowerCase())
      )
    );
  }

  if (typeof value === 'string') {
    const values = value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return values.length > 0 ? values : ['in_app', 'push'];
  }

  return ['in_app', 'push'];
};

const normalizeNotification = (attrs: NotificationPayload) => {
  const type = attrs.type;
  return {
    ...attrs,
    title: attrs.title ?? defaultTitle(type),
    priority: attrs.priority ?? 'high',
    campaign_type: attrs.campaign_type ?? 'transactional',
    silent: attrs.silent ?? false,
    delivery_types: normalizeDeliveryTypes(attrs.delivery_types),
    data: normalizeMap(attrs.data),
  };
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

const parseServiceAccountJson = (value: string) => {
  const raw = value.trim().replace(/^['"]|['"]$/g, '');
  try {
    return JSON.parse(raw.replace(/\\n/g, '\n')) as admin.ServiceAccount;
  } catch {
    return null;
  }
};

const loadServiceAccountJson = (): admin.ServiceAccount | null => {
  const fromEnv = process.env.FCM_SERVICE_ACCOUNT_JSON ? parseServiceAccountJson(process.env.FCM_SERVICE_ACCOUNT_JSON) : null;
  if (fromEnv) return fromEnv;

  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const candidatePaths = [
    configuredPath,
    path.resolve(process.cwd(), 'internal/notification/universearch-af5a4-firebase-adminsdk-fbsvc-bb57157828.json'),
    path.resolve(process.cwd(), 'universearch-af5a4-firebase-adminsdk-fbsvc-bb57157828.json'),
    path.resolve(process.cwd(), 'internal/notification/universearch-af5a4-firebase-adminsdk-fbsvc-bb57157828.json'.replace(/\\/g, '/')),
  ].filter((value): value is string => Boolean(value));

  for (const candidatePath of candidatePaths) {
    if (!existsSync(candidatePath)) continue;

    try {
      const fileContents = readFileSync(candidatePath, 'utf8');
      const parsed = JSON.parse(fileContents) as admin.ServiceAccount;
      if ((parsed as any)?.project_id || (parsed as any)?.projectId) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to read FCM service account file', { candidatePath, error });
    }
  }

  return null;
};

const getFirebaseMessaging = (): admin.messaging.Messaging | null => {
  if (admin.apps.length > 0) {
    return admin.messaging();
  }

  console.log('Initializing Firebase...');

  const serviceAccountJson = loadServiceAccountJson();
  const hasGoogleCreds = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) || Boolean(serviceAccountJson);

  if (!serviceAccountJson && !hasGoogleCreds) {
    console.warn('FCM push disabled: no Firebase credentials configured');
    return null;
  }

  try {
    const credential = serviceAccountJson
      ? admin.credential.cert(serviceAccountJson)
      : admin.credential.applicationDefault();

    admin.initializeApp({
      credential,
      projectId: process.env.FCM_PROJECT_ID,
    });

    console.log('Firebase initialized');
    return admin.messaging();
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging', error);
    return null;
  }
};

const stringifyPushData = (data: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
  );
};

export class NotificationService {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(attrs: NotificationPayload) {
    const payload = normalizeNotification(attrs);
    if (!payload.user_id || !payload.type || !payload.message) {
      throw Object.assign(new Error('user_id, type and message are required'), { statusCode: 422 });
    }

    const insertPayload = {
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      priority: payload.priority,
      campaign_type: payload.campaign_type,
      delivery_types: payload.delivery_types,
      silent: payload.silent,
      data: payload.data,
    };

    const { data, error } = await this.supabase.from('notifications').insert([insertPayload]).select().single();
    if (error) throw Object.assign(new Error(error.message), { statusCode: 422 });

    if (payload.user_id && payload.delivery_types.includes('push')) {
      try {
        await this.sendPushNotification(data, String(payload.user_id));
      } catch (error) {
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

  async broadcast(attrs: NotificationPayload) {
    const recipients = await this.resolveRecipients(attrs);
    if (recipients.length === 0) {
      throw Object.assign(new Error('No recipients found for notification'), { statusCode: 422 });
    }

    const { target_all, targeting, user_ids, recipient_user_ids, recipient_user_id, ...notificationAttrs } = attrs as any;

    const notifications = [];
    const errors = [];
    for (const userId of recipients) {
      try {
        notifications.push(await this.create({ ...notificationAttrs, user_id: userId }));
      } catch (error) {
        errors.push({ user_id: userId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return { notifications, errors, count: notifications.length };
  }

  async list(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('inserted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async unreadCount(userId: string) {
    const { data, error } = await this.supabase
      .from('user_notification_stats')
      .select('unread_count')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.unread_count ?? 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.getOwnedNotification(notificationId, userId);
    if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 422 });

    const { data, error } = await this.supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw Object.assign(new Error(error.message), { statusCode: 422 });

    if (!notification.read) await this.incrementUnread(userId, -1);
    return data;
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.getNotification(notificationId);
    if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
    if (notification.user_id !== userId) throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });

    const { data, error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .select()
      .single();
    if (error) throw Object.assign(new Error(error.message), { statusCode: 422 });

    if (!notification.read) await this.incrementUnread(userId, -1);
    return data;
  }

  async deleteAll(userId: string) {
    const unread = await this.unreadCount(userId);
    const { data, error } = await this.supabase.from('notifications').delete().eq('user_id', userId).select('id');
    if (error) throw error;
    if (unread > 0) {
      await this.supabase.from('user_notification_stats').upsert({ user_id: userId, unread_count: 0 });
    }
    return data?.length ?? 0;
  }

  async registerDevice(userId: string, attrs: DeviceTokenPayload) {
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
    if (error) throw Object.assign(new Error(error.message), { statusCode: 422 });
    return data;
  }

  async trackEvent(notificationId: string, userId: string, eventType: string, metadata: Record<string, unknown>, token?: string) {
    if (!['delivered', 'opened', 'clicked'].includes(eventType)) {
      throw Object.assign(new Error('Unsupported event type'), { statusCode: 422 });
    }

    const notification = await this.getNotification(notificationId);
    if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
    if (notification.user_id !== userId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

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
    if (error) throw Object.assign(new Error(error.message), { statusCode: 422 });
    return data;
  }

  async analytics(notificationId: string, userId: string) {
    const notification = await this.getNotification(notificationId);
    if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
    if (notification.user_id !== userId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const { data, error } = await this.supabase
      .from('notification_events')
      .select('event_type')
      .eq('notification_id', notificationId);
    if (error) throw error;

    const counts = (data ?? []).reduce<Record<string, number>>((acc, event) => {
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

  private async resolveRecipients(attrs: NotificationPayload) {
    const explicitUserIds = attrs.user_ids ?? attrs.recipient_user_ids;
    if (explicitUserIds?.length) return Array.from(new Set(explicitUserIds.map(String)));
    if (attrs.user_id) return [String(attrs.user_id)];
    if (attrs.recipient_user_id) return [String(attrs.recipient_user_id)];

    const targeting = normalizeMap(attrs.targeting);
    const targetAll =
      Boolean(attrs.target_all) ||
      Boolean(targeting.target_all) ||
      Boolean(targeting.all) ||
      String(targeting.scope ?? targeting.target_scope ?? '').trim().toLowerCase() === 'all';

    if (targetAll) {
      const { data, error } = await this.supabase.from('profiles').select('id');
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((row: any) => String(row.id)).filter(Boolean)));
    }

    let query = this.supabase.from('device_tokens').select('user_id').is('disabled_at', null);
    if (targeting.user_type) query = query.eq('user_type', String(targeting.user_type));
    if (Array.isArray(targeting.platforms) && targeting.platforms.length > 0) {
      query = query.in('platform', targeting.platforms.map(String));
    }

    const { data, error } = await query;
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((row) => String(row.user_id))));
  }

  private async getNotification(notificationId: string) {
    const { data, error } = await this.supabase.from('notifications').select('*').eq('id', notificationId).maybeSingle();
    if (error) throw error;
    return data;
  }

  private async getOwnedNotification(notificationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  private async sendPushNotification(notification: any, userId: string) {
    console.log('========== SEND PUSH ==========');
    console.log('User:', userId);

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.log('No Firebase messaging instance available');
      return;
    }

    const { data, error } = await this.supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('provider', 'fcm')
      .is('disabled_at', null);
    if (error) throw error;

    console.log('DB returned:', data);

    const tokens = Array.from(
      new Set((data ?? [])
        .map((row: any) => String(row.token || ''))
        .filter(Boolean))
    );
    console.log('Tokens:', tokens.length);
    if (tokens.length === 0) {
      console.log('No device tokens found for user');
      return;
    }

    const notificationData = normalizeMap(notification.data);
    const messageData = {
      ...stringifyPushData(notificationData),
      notification_id: String(notification.id ?? ''),
      type: notification.type ?? '',
      campaign_type: notification.campaign_type ?? '',
    };

    const multicastMessage: admin.messaging.MulticastMessage = {
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

    console.log('Sending to Firebase...');
    const response = await messaging.sendMulticast(multicastMessage);
    console.log('Success:', response.successCount);
    console.log('Failure:', response.failureCount);
    console.log('Firebase response:', response.responses);
    console.log(JSON.stringify(response, null, 2));

    if (response.failureCount > 0) {
      const failures = response.responses
        .map((resp, index) => (resp.success ? null : `token[${index}]: ${resp.error?.code || resp.error?.message || 'unknown'}`))
        .filter(Boolean);
      if (failures.length > 0) {
        throw new Error(`FCM multicast failures: ${failures.join('; ')}`);
      }
    }
  }

  private async findDeviceTokenId(userId: string, token: string) {
    const { data, error } = await this.supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  }

  private async incrementUnread(userId: string, delta = 1) {
    const current = await this.unreadCount(userId);
    const next = Math.max(0, current + delta);
    await this.supabase.from('user_notification_stats').upsert({ user_id: userId, unread_count: next });
  }
}

const ratio = (value: number, denominator: number) => (denominator === 0 ? 0 : Number((value / denominator).toFixed(4)));
