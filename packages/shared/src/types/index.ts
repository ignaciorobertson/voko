import {
  ResourceType,
  BookingMode,
  ConfirmationMode,
  BusinessStatus,
} from '../enums/index.js';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    totalItems?: number;
    totalPages?: number;
  };
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
  details?: ApiErrorDetail[];
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  database: {
    status: 'up' | 'down';
    type: string;
    details?: string;
  };
  environment: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isSuperadmin: boolean;
}

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  status: string;
}

export interface AppointmentSlot {
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  resourceId?: string;
  available: boolean;
}

export interface BusinessSettingsDetail {
  id: string;
  businessId: string;
  allowPublicBooking: boolean;
  requireEmailVerification: boolean;
  defaultSlotIntervalMinutes: number;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  customNotificationConfig?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchDetail {
  id: string;
  businessId: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetail {
  id: string;
  businessId: string;
  branchId: string;
  userId?: string;
  name: string;
  resourceType: ResourceType;
  description?: string;
  isActive: boolean;
  branchName?: string;
  branch?: { id: string; name: string };
  serviceIds?: string[];
  services?: { serviceId: string; serviceName: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDetail {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minBookingNoticeMinutes: number;
  maxBookingAdvanceDays: number;
  cancellationDeadlineMinutes: number;
  bookingMode: BookingMode;
  confirmationMode: ConfirmationMode;
  isActive: boolean;
  resources?: { resourceId: string; resourceName: string; isPrimary: boolean }[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  logoUrl?: string;
  contactEmail: string;
  phone?: string;
  taxId?: string;
  timezone: string;
  currency: string;
  status: BusinessStatus;
  settings?: BusinessSettingsDetail;
  branches?: BranchDetail[];
  createdAt: string;
  updatedAt: string;
}
