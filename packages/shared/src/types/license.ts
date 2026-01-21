/**
 * License-related types for business/operational licenses
 */

import { AuditInfo, BaseEntity } from './common';

export type LicenseType =
  | 'environmental_permit'
  | 'waste_management'
  | 'emissions_permit'
  | 'water_discharge'
  | 'hazardous_materials'
  | 'renewable_energy'
  | 'sustainability_reporting'
  | 'carbon_trading'
  | 'custom';

export type LicenseStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_payment'
  | 'pending_inspection'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'suspended'
  | 'revoked';

export interface License extends BaseEntity {
  licenseNumber: string;
  organizationId: string;
  type: LicenseType;
  status: LicenseStatus;
  scope: string;
  conditions: string[];
  issuedAt?: Date;
  validFrom?: Date;
  validUntil?: Date;
  fee: LicenseFee;
  audit: AuditInfo;
}

export interface LicenseApplication extends BaseEntity {
  licenseId?: string;
  organizationId: string;
  applicantId: string;
  type: LicenseType;
  status: LicenseStatus;
  submittedAt?: Date;
  documents: LicenseDocument[];
  inspections: Inspection[];
  payments: Payment[];
  conditions: ProposedCondition[];
  comments: LicenseComment[];
  audit: AuditInfo;
}

export interface LicenseDocument {
  id: string;
  name: string;
  type: LicenseDocumentType;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_update';
}

export type LicenseDocumentType =
  | 'application_form'
  | 'site_plan'
  | 'environmental_impact'
  | 'safety_plan'
  | 'insurance_certificate'
  | 'financial_guarantee'
  | 'technical_specification'
  | 'compliance_report'
  | 'other';

export interface Inspection {
  id: string;
  inspectorId: string;
  scheduledAt: Date;
  conductedAt?: Date;
  type: InspectionType;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  findings: InspectionFinding[];
  overallResult?: 'pass' | 'pass_with_conditions' | 'fail';
  report?: string;
}

export type InspectionType = 'initial' | 'routine' | 'follow_up' | 'complaint' | 'renewal';

export interface InspectionFinding {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  correctionRequired: boolean;
  correctionDeadline?: Date;
  correctedAt?: Date;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  type: PaymentType;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method?: string;
  transactionId?: string;
  paidAt?: Date;
  receiptUrl?: string;
}

export type PaymentType = 'application_fee' | 'license_fee' | 'renewal_fee' | 'inspection_fee' | 'penalty';

export interface LicenseFee {
  applicationFee: number;
  licenseFee: number;
  renewalFee: number;
  currency: string;
}

export interface ProposedCondition {
  id: string;
  condition: string;
  category: string;
  monitoringRequired: boolean;
  reportingFrequency?: 'monthly' | 'quarterly' | 'annually';
}

export interface LicenseComment {
  id: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface LicenseTemplate {
  id: string;
  type: LicenseType;
  name: string;
  description: string;
  requiredDocuments: LicenseDocumentType[];
  standardConditions: ProposedCondition[];
  fee: LicenseFee;
  validityPeriod: number; // in months
  renewalPeriod: number; // in months before expiry
  requiresInspection: boolean;
}
