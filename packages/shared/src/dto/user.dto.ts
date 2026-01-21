/**
 * User DTOs for API communication
 */

import { UserRole, Address, ContactInfo, UserPreferences, OrganizationType } from '../types';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  profilePicture?: string;
  address?: Address;
  contactInfo?: ContactInfo;
  preferences?: UserPreferences;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface CreateOrganizationDto {
  name: string;
  registrationNumber: string;
  type: OrganizationType;
  address: Address;
  contactInfo: ContactInfo;
}

export interface UpdateOrganizationDto {
  name?: string;
  type?: OrganizationType;
  address?: Address;
  contactInfo?: ContactInfo;
}
