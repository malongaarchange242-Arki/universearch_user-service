export type NotificationPayload = {
  user_id?: string;
  type?: string;
  title?: string | null;
  message?: string;
  data?: Record<string, unknown>;
  read?: boolean;
  delivery_types?: string[];
  priority?: 'high' | 'normal';
  deep_link?: string | null;
  collapse_key?: string | null;
  silent?: boolean;
  campaign_type?: 'transactional' | 'engagement' | 'sponsored' | 'system';
  sponsor_id?: string | null;
  user_ids?: string[];
  targeting?: Record<string, unknown>;
};

export type DeviceTokenPayload = {
  token?: string;
  platform?: 'web' | 'android' | 'ios';
  provider?: 'fcm';
  user_type?: string | null;
  interests?: string[];
  locale?: string | null;
  device_id?: string | null;
  metadata?: Record<string, unknown>;
};
