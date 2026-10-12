import { apiClient } from './client.js';
import {
  BusinessDetail,
  BranchDetail,
  ServiceDetail,
  ResourceDetail,
  BusinessSettingsDetail,
} from '@voko/shared';

export const businessesApi = {
  async getMyBusinesses(): Promise<BusinessDetail[]> {
    const res = await apiClient.get<BusinessDetail[]>('/businesses/my-businesses');
    return res.data;
  },

  async getBusiness(businessId: string): Promise<BusinessDetail & { stats: any }> {
    const res = await apiClient.get(`/businesses/${businessId}`);
    return res.data;
  },

  async createBusiness(data: any): Promise<BusinessDetail> {
    const res = await apiClient.post<BusinessDetail>('/businesses', data);
    return res.data;
  },

  async updateBusiness(businessId: string, data: any): Promise<BusinessDetail> {
    const res = await apiClient.patch<BusinessDetail>(`/businesses/${businessId}`, data);
    return res.data;
  },

  async getSettings(businessId: string): Promise<BusinessSettingsDetail> {
    const res = await apiClient.get<BusinessSettingsDetail>(`/businesses/${businessId}/settings`);
    return res.data;
  },

  async updateSettings(businessId: string, data: any): Promise<BusinessSettingsDetail> {
    const res = await apiClient.patch<BusinessSettingsDetail>(`/businesses/${businessId}/settings`, data);
    return res.data;
  },

  // Sucursales
  async getBranches(businessId: string): Promise<BranchDetail[]> {
    const res = await apiClient.get<BranchDetail[]>(`/businesses/${businessId}/branches`);
    return res.data;
  },

  async createBranch(businessId: string, data: any): Promise<BranchDetail> {
    const res = await apiClient.post<BranchDetail>(`/businesses/${businessId}/branches`, data);
    return res.data;
  },

  async updateBranch(businessId: string, branchId: string, data: any): Promise<BranchDetail> {
    const res = await apiClient.patch<BranchDetail>(`/businesses/${businessId}/branches/${branchId}`, data);
    return res.data;
  },

  // Servicios
  async getServices(businessId: string): Promise<ServiceDetail[]> {
    const res = await apiClient.get<ServiceDetail[]>(`/businesses/${businessId}/services`);
    return res.data;
  },

  async createService(businessId: string, data: any): Promise<ServiceDetail> {
    const res = await apiClient.post<ServiceDetail>(`/businesses/${businessId}/services`, data);
    return res.data;
  },

  async updateService(businessId: string, serviceId: string, data: any): Promise<ServiceDetail> {
    const res = await apiClient.patch<ServiceDetail>(`/businesses/${businessId}/services/${serviceId}`, data);
    return res.data;
  },

  // Recursos
  async getResources(businessId: string): Promise<ResourceDetail[]> {
    const res = await apiClient.get<ResourceDetail[]>(`/businesses/${businessId}/resources`);
    return res.data;
  },

  async createResource(businessId: string, data: any): Promise<ResourceDetail> {
    const res = await apiClient.post<ResourceDetail>(`/businesses/${businessId}/resources`, data);
    return res.data;
  },

  async updateResource(businessId: string, resourceId: string, data: any): Promise<ResourceDetail> {
    const res = await apiClient.patch<ResourceDetail>(`/businesses/${businessId}/resources/${resourceId}`, data);
    return res.data;
  },
};
