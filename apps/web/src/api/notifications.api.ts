import { apiClient } from './client.js';
import { NotificationChannel, NotificationStatus } from '@voko/shared';

export interface NotificationItem {
  id: string;
  businessId: string;
  recipientEmail: string;
  eventType: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  retryCount: number;
  lastError?: string;
  payload: Record<string, any>;
  scheduledAt: string;
  processedAt?: string;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  retrying: number;
  failed: number;
  deliverySuccessRate: number;
  byChannel: {
    email: number;
    webhook: number;
  };
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TemplatePreviewResponse {
  subject: string;
  html: string;
  text: string;
}

export const notificationsApi = {
  async getNotifications(
    businessId: string,
    params?: {
      status?: NotificationStatus;
      channel?: NotificationChannel;
      eventType?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<NotificationListResponse> {
    const res = await apiClient.get<NotificationListResponse>(
      `/businesses/${businessId}/notifications`,
      { params },
    );
    return res.data;
  },

  async getStats(businessId: string): Promise<NotificationStats> {
    const res = await apiClient.get<NotificationStats>(
      `/businesses/${businessId}/notifications/stats`,
    );
    return res.data;
  },

  async dispatchBatch(businessId: string): Promise<{ totalProcessed: number; sentCount: number; retryingCount: number; failedCount: number }> {
    const res = await apiClient.post(`/businesses/${businessId}/notifications/dispatch`);
    return res.data;
  },

  async dispatchReminders(businessId: string): Promise<{ remindersCreated: number; appointmentIds: string[] }> {
    const res = await apiClient.post(`/businesses/${businessId}/notifications/dispatch-reminders`);
    return res.data;
  },

  async retryNotification(businessId: string, notificationId: string): Promise<NotificationItem> {
    const res = await apiClient.post(
      `/businesses/${businessId}/notifications/${notificationId}/retry`,
    );
    return res.data;
  },

  async testPreview(
    businessId: string,
    payload: {
      eventType: 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_REMINDER';
      payload: Record<string, any>;
    },
  ): Promise<TemplatePreviewResponse> {
    const res = await apiClient.post<TemplatePreviewResponse>(
      `/businesses/${businessId}/notifications/test-preview`,
      payload,
    );
    return res.data;
  },
};
