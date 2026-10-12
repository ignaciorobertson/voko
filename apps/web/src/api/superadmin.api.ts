import { apiClient } from './client.js';
import { BusinessStatus, UserRole } from '@voko/shared';

export interface GlobalOverviewMetrics {
  overview: {
    totalBusinesses: number;
    activeBusinesses: number;
    suspendedBusinesses: number;
    pendingBusinesses: number;
    totalUsers: number;
    totalSuperadmins: number;
    totalAppointments: number;
    completedAppointments: number;
    totalVolumeRevenue: number;
    currency: string;
  };
  appointmentsStatusBreakdown: {
    completed: number;
    cancelledByCustomer: number;
    cancelledByBusiness: number;
    noShow: number;
    pendingOrConfirmed: number;
  };
  industryBreakdown: Array<{
    industry: string;
    count: number;
  }>;
}

export interface SuperadminBusinessItem {
  id: string;
  name: string;
  slug: string;
  industry: string;
  status: BusinessStatus;
  contactEmail: string;
  phone?: string;
  timezone: string;
  currency: string;
  createdAt: string;
  metrics: {
    branchesCount: number;
    servicesCount: number;
    resourcesCount: number;
    membersCount: number;
    appointmentsCount: number;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface SuperadminBusinessDetails {
  business: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    industry?: string;
    contactEmail: string;
    phone?: string;
    timezone: string;
    currency: string;
    status: BusinessStatus;
    createdAt: string;
  };
  settings: any;
  branches: Array<{
    id: string;
    name: string;
    address?: string;
    isDefault: boolean;
    isActive: boolean;
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    bookingMode: string;
    isActive: boolean;
  }>;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
  }>;
  members: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: UserRole;
    status: string;
  }>;
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
  };
  recentAppointments: any[];
}

export interface CreateBusinessSuperadminPayload {
  name: string;
  slug?: string;
  industry?: string;
  contactEmail: string;
  phone?: string;
  timezone?: string;
  currency?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  initialPassword?: string;
}

export interface UpdateBusinessStatusPayload {
  status: BusinessStatus;
  reason?: string;
}

export interface AssignBusinessAdminPayload {
  email: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface SuperadminUserItem {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  isSuperadmin: boolean;
  activeMembershipsCount: number;
  createdAt: string;
}

export interface GlobalAuditLogItem {
  id: string;
  businessId?: string;
  action: string;
  entityName: string;
  entityId: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  diffData?: any;
  createdAt: string;
}

export const superadminApi = {
  async getOverview(): Promise<GlobalOverviewMetrics> {
    const res = await apiClient.get<GlobalOverviewMetrics>('/superadmin/overview');
    return res.data;
  },

  async listBusinesses(params?: { search?: string; status?: BusinessStatus }): Promise<SuperadminBusinessItem[]> {
    const res = await apiClient.get<SuperadminBusinessItem[]>('/superadmin/businesses', { params });
    return res.data;
  },

  async getBusinessDetails(businessId: string): Promise<SuperadminBusinessDetails> {
    const res = await apiClient.get<SuperadminBusinessDetails>(`/superadmin/businesses/${businessId}`);
    return res.data;
  },

  async createBusiness(payload: CreateBusinessSuperadminPayload): Promise<any> {
    const res = await apiClient.post('/superadmin/businesses', payload);
    return res.data;
  },

  async updateBusinessStatus(businessId: string, payload: UpdateBusinessStatusPayload): Promise<any> {
    const res = await apiClient.patch(`/superadmin/businesses/${businessId}/status`, payload);
    return res.data;
  },

  async assignAdmin(businessId: string, payload: AssignBusinessAdminPayload): Promise<any> {
    const res = await apiClient.post(`/superadmin/businesses/${businessId}/admins`, payload);
    return res.data;
  },

  async listUsers(search?: string): Promise<SuperadminUserItem[]> {
    const res = await apiClient.get<SuperadminUserItem[]>('/superadmin/users', {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  async toggleSuperadmin(userId: string): Promise<{ userId: string; email: string; isSuperadmin: boolean; message: string }> {
    const res = await apiClient.patch(`/superadmin/users/${userId}/toggle-superadmin`);
    return res.data;
  },

  async getAuditLogs(limit = 50): Promise<GlobalAuditLogItem[]> {
    const res = await apiClient.get<GlobalAuditLogItem[]>('/superadmin/audit', {
      params: { limit },
    });
    return res.data;
  },
};
