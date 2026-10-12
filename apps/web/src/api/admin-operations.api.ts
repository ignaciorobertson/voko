import { apiClient } from './client.js';

export interface AdminAppointment {
  id: string;
  businessId: string;
  branchId: string;
  serviceId: string;
  resourceId?: string;
  customerId: string;
  startTime: string;
  endTime: string;
  status: string;
  snapshotPrice?: number;
  snapshotCurrency?: string;
  snapshotDurationMinutes: number;
  customerNotes?: string;
  internalNotes?: string;
  service?: {
    id: string;
    name: string;
    durationMinutes: number;
    price?: number;
    currency?: string;
  };
  resource?: {
    id: string;
    name: string;
    resourceType: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  branch?: {
    id: string;
    name: string;
    address?: string;
  };
  events?: Array<{
    id: string;
    eventType: string;
    previousStatus?: string;
    newStatus: string;
    actorUserId?: string;
    createdAt: string;
  }>;
}

export interface AdminCustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  cancelledCount: number;
  lastAppointmentDate?: string;
  joinedAt: string;
  notes?: string;
}

export interface AdminReportsSummary {
  period: {
    startDate?: string;
    endDate?: string;
  };
  metrics: {
    totalAppointments: number;
    completedAppointments: number;
    noShowAppointments: number;
    cancelledAppointments: number;
    pendingAppointments: number;
    confirmedAppointments: number;
    attendanceRate: number;
    noShowRate: number;
    cancellationRate: number;
    realizedRevenue: number;
    projectedRevenue: number;
    currency: string;
  };
  byStatus: Record<string, number>;
  topServices: Array<{
    id: string;
    name: string;
    count: number;
    revenue: number;
  }>;
  resourcePerformance: Array<{
    id: string;
    name: string;
    totalAppointments: number;
    completedAppointments: number;
    hoursWorked: number;
  }>;
}

export interface AdminAuditItem {
  id: string;
  appointmentId: string;
  eventType: string;
  previousStatus?: string;
  newStatus: string;
  actorUserId?: string;
  actorName: string;
  serviceName: string;
  customerName: string;
  appointmentTime?: string;
  metadata?: any;
  createdAt: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  invitationType: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export const adminOperationsApi = {
  // Agenda / Citas
  async getAppointments(
    businessId: string,
    filters?: {
      branchId?: string;
      resourceId?: string;
      customerId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<AdminAppointment[]> {
    const res = await apiClient.get<AdminAppointment[]>(
      `/businesses/${businessId}/appointments`,
      { params: filters },
    );
    return res.data;
  },

  async updateAppointmentStatus(
    businessId: string,
    appointmentId: string,
    status: string,
    notes?: string,
  ): Promise<AdminAppointment> {
    const res = await apiClient.patch<AdminAppointment>(
      `/businesses/${businessId}/appointments/${appointmentId}/status`,
      { status, notes },
    );
    return res.data;
  },

  async createManualAppointment(
    businessId: string,
    data: {
      serviceId: string;
      resourceId?: string;
      branchId?: string;
      startTime: string;
      customerId?: string;
      newCustomer?: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      };
      customerNotes?: string;
      internalNotes?: string;
    },
  ): Promise<AdminAppointment> {
    const res = await apiClient.post<AdminAppointment>(
      `/businesses/${businessId}/appointments/manual`,
      data,
    );
    return res.data;
  },

  async cancelAppointment(
    businessId: string,
    appointmentId: string,
    reason?: string,
  ): Promise<AdminAppointment> {
    const res = await apiClient.post<AdminAppointment>(
      `/businesses/${businessId}/appointments/${appointmentId}/cancel`,
      { reason },
    );
    return res.data;
  },

  async rescheduleAppointment(
    businessId: string,
    appointmentId: string,
    newStartTime: string,
    newResourceId?: string,
  ): Promise<AdminAppointment> {
    const res = await apiClient.post<AdminAppointment>(
      `/businesses/${businessId}/appointments/${appointmentId}/reschedule`,
      { newStartTime, newResourceId },
    );
    return res.data;
  },

  // CRM Clientes
  async getCustomers(businessId: string, search?: string): Promise<AdminCustomerSummary[]> {
    const res = await apiClient.get<AdminCustomerSummary[]>(
      `/businesses/${businessId}/customers`,
      { params: { search } },
    );
    return res.data;
  },

  async getCustomerDetail(businessId: string, customerId: string) {
    const res = await apiClient.get(
      `/businesses/${businessId}/customers/${customerId}`,
    );
    return res.data;
  },

  async updateCustomerNotes(businessId: string, customerId: string, notes: string) {
    const res = await apiClient.patch(
      `/businesses/${businessId}/customers/${customerId}/notes`,
      { notes },
    );
    return res.data;
  },

  // Reportes y Auditoría
  async getReportsSummary(
    businessId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AdminReportsSummary> {
    const res = await apiClient.get<AdminReportsSummary>(
      `/businesses/${businessId}/reports/summary`,
      { params: { startDate, endDate } },
    );
    return res.data;
  },

  async getAuditHistory(businessId: string, limit = 50): Promise<AdminAuditItem[]> {
    const res = await apiClient.get<AdminAuditItem[]>(
      `/businesses/${businessId}/reports/audit`,
      { params: { limit } },
    );
    return res.data;
  },

  // Invitaciones
  async getInvitations(businessId: string): Promise<AdminInvitation[]> {
    const res = await apiClient.get<AdminInvitation[]>(
      `/invitations/businesses/${businessId}`,
    );
    return res.data;
  },

  async sendInvitation(data: { email: string; role: string; businessId: string }) {
    const res = await apiClient.post('/invitations/create', data);
    return res.data;
  },

  async revokeInvitation(businessId: string, invitationId: string) {
    const res = await apiClient.post(
      `/invitations/businesses/${businessId}/${invitationId}/revoke`,
    );
    return res.data;
  },

  // Reglas y Excepciones de Disponibilidad
  async getAvailabilityRules(businessId: string) {
    const res = await apiClient.get(`/businesses/${businessId}/availability/rules`);
    return res.data;
  },

  async createAvailabilityRule(businessId: string, data: any) {
    const res = await apiClient.post(`/businesses/${businessId}/availability/rules`, data);
    return res.data;
  },

  async deleteAvailabilityRule(businessId: string, ruleId: string) {
    const res = await apiClient.delete(`/businesses/${businessId}/availability/rules/${ruleId}`);
    return res.data;
  },

  async getAvailabilityExceptions(businessId: string) {
    const res = await apiClient.get(`/businesses/${businessId}/availability/exceptions`);
    return res.data;
  },

  async createAvailabilityException(businessId: string, data: any) {
    const res = await apiClient.post(`/businesses/${businessId}/availability/exceptions`, data);
    return res.data;
  },

  async deleteAvailabilityException(businessId: string, exceptionId: string) {
    const res = await apiClient.delete(`/businesses/${businessId}/availability/exceptions/${exceptionId}`);
    return res.data;
  },
};
