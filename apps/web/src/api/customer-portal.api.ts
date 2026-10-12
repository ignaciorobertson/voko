import { apiClient } from './client.js';

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  createdAt: string;
  stats: {
    upcomingCount: number;
    completedCount: number;
  };
}

export interface CustomerAppointmentItem {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  serviceId: string;
  serviceName: string;
  resourceName: string;
  branchName: string;
  branchAddress?: string;
  startTime: string;
  endTime: string;
  status: string;
  snapshotPrice?: number;
  snapshotCurrency?: string;
  snapshotDurationMinutes: number;
  customerNotes?: string;
  cancellationDeadlineMinutes: number;
  canCancelOrReschedule: boolean;
}

export const customerPortalApi = {
  async getProfile(): Promise<CustomerProfile> {
    const res = await apiClient.get<CustomerProfile>('/portal/me');
    return res.data;
  },

  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string }): Promise<CustomerProfile> {
    const res = await apiClient.patch<CustomerProfile>('/portal/me', data);
    return res.data;
  },

  async getAppointments(filter?: 'upcoming' | 'past'): Promise<CustomerAppointmentItem[]> {
    const res = await apiClient.get<CustomerAppointmentItem[]>('/portal/appointments', {
      params: { filter },
    });
    return res.data;
  },

  async cancelAppointment(appointmentId: string, reason?: string) {
    const res = await apiClient.post(`/portal/appointments/${appointmentId}/cancel`, { reason });
    return res.data;
  },

  async rescheduleAppointment(appointmentId: string, startTime: string, resourceId?: string) {
    const res = await apiClient.post(`/portal/appointments/${appointmentId}/reschedule`, {
      startTime,
      resourceId,
    });
    return res.data;
  },
};
