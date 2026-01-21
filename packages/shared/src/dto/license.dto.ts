/**
 * License DTOs for API communication
 */

import {
  LicenseType,
  LicenseStatus,
  LicenseDocumentType,
  InspectionType,
  PaymentType,
} from '../types';
import { PaginationQueryDto } from './common.dto';

export interface CreateLicenseApplicationDto {
  organizationId: string;
  type: LicenseType;
  scope: string;
}

export interface UpdateLicenseApplicationDto {
  scope?: string;
  status?: LicenseStatus;
}

export interface SubmitLicenseApplicationDto {
  applicationId: string;
  declaration: boolean;
}

export interface LicenseDocumentUploadDto {
  applicationId: string;
  name: string;
  type: LicenseDocumentType;
  file: File | Blob;
}

export interface UpdateLicenseDocumentStatusDto {
  documentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_update';
  comments?: string;
}

export interface ScheduleInspectionDto {
  applicationId: string;
  inspectorId: string;
  type: InspectionType;
  scheduledAt: string;
}

export interface UpdateInspectionDto {
  findings?: {
    category: string;
    description: string;
    severity: 'critical' | 'major' | 'minor' | 'observation';
    correctionRequired: boolean;
    correctionDeadline?: string;
  }[];
  overallResult?: 'pass' | 'pass_with_conditions' | 'fail';
  report?: string;
}

export interface CompleteInspectionDto {
  inspectionId: string;
  overallResult: 'pass' | 'pass_with_conditions' | 'fail';
  report: string;
}

export interface CreatePaymentDto {
  applicationId: string;
  amount: number;
  currency: string;
  type: PaymentType;
  method: string;
}

export interface ConfirmPaymentDto {
  paymentId: string;
  transactionId: string;
}

export interface AddLicenseConditionDto {
  applicationId: string;
  condition: string;
  category: string;
  monitoringRequired: boolean;
  reportingFrequency?: 'monthly' | 'quarterly' | 'annually';
}

export interface AddLicenseCommentDto {
  applicationId: string;
  content: string;
  isInternal: boolean;
}

export interface LicenseQueryDto extends PaginationQueryDto {
  organizationId?: string;
  type?: LicenseType;
  status?: LicenseStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApproveLicenseDto {
  applicationId: string;
  licenseNumber: string;
  validFrom: string;
  validUntil: string;
  conditions: string[];
}

export interface RejectLicenseDto {
  applicationId: string;
  reason: string;
}

export interface SuspendLicenseDto {
  licenseId: string;
  reason: string;
  effectiveDate: string;
}

export interface RevokeLicenseDto {
  licenseId: string;
  reason: string;
  effectiveDate: string;
}

export interface RenewLicenseDto {
  licenseId: string;
  newValidUntil: string;
}
