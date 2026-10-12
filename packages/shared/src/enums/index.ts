export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export enum BusinessStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum BookingMode {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP_SESSION = 'GROUP_SESSION',
  RESOURCE_ONLY = 'RESOURCE_ONLY',
}

export enum ConfirmationMode {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL_APPROVAL = 'MANUAL_APPROVAL',
}

export enum ResourceType {
  STAFF = 'STAFF',
  ROOM = 'ROOM',
  COURT = 'COURT',
  BOX = 'BOX',
  EQUIPMENT = 'EQUIPMENT',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED_BY_CUSTOMER = 'CANCELLED_BY_CUSTOMER',
  CANCELLED_BY_BUSINESS = 'CANCELLED_BY_BUSINESS',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentEventType {
  CREATED = 'CREATED',
  CONFIRMED = 'CONFIRMED',
  RESCHEDULED = 'RESCHEDULED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  CANCELLED = 'CANCELLED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
}

export enum ExceptionType {
  HOLIDAY = 'HOLIDAY',
  VACATION = 'VACATION',
  BREAK = 'BREAK',
  EXTRAORDINARY_OPENING = 'EXTRAORDINARY_OPENING',
  BLOCK = 'BLOCK',
}

export enum SessionStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum InvitationType {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  N8N_WEBHOOK = 'N8N_WEBHOOK',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}
