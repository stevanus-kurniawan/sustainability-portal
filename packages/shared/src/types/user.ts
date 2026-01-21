/**
 * User-related types
 */

import { Address, AuditInfo, BaseEntity, ContactInfo, Status } from './common';

export type UserRole = 'admin' | 'officer' | 'auditor' | 'applicant' | 'viewer';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: Status;
  organizationId?: string;
  profilePicture?: string;
  lastLoginAt?: Date;
}

export interface UserProfile extends User {
  address?: Address;
  contactInfo?: ContactInfo;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export interface Organization extends BaseEntity {
  name: string;
  registrationNumber: string;
  type: OrganizationType;
  status: Status;
  address: Address;
  contactInfo: ContactInfo;
  audit: AuditInfo;
}

export type OrganizationType =
  | 'corporation'
  | 'llc'
  | 'partnership'
  | 'sole_proprietorship'
  | 'non_profit'
  | 'government';

export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}
