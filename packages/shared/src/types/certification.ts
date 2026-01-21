/**
 * Certification-related types for sustainability certifications
 */

import { AuditInfo, BaseEntity } from './common';

export type CertificationType =
  | 'iso_14001'
  | 'iso_50001'
  | 'leed'
  | 'breeam'
  | 'energy_star'
  | 'green_seal'
  | 'carbon_neutral'
  | 'b_corp'
  | 'custom';

export type CertificationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked';

export interface Certification extends BaseEntity {
  applicationNumber: string;
  organizationId: string;
  type: CertificationType;
  status: CertificationStatus;
  scope: string;
  validFrom?: Date;
  validUntil?: Date;
  issuedAt?: Date;
  audit: AuditInfo;
}

export interface CertificationApplication extends BaseEntity {
  certificationId: string;
  organizationId: string;
  applicantId: string;
  type: CertificationType;
  status: CertificationStatus;
  submittedAt?: Date;
  documents: CertificationDocument[];
  assessments: Assessment[];
  comments: ApplicationComment[];
  audit: AuditInfo;
}

export interface CertificationDocument {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: DocumentStatus;
}

export type DocumentType =
  | 'application_form'
  | 'financial_statement'
  | 'environmental_report'
  | 'audit_report'
  | 'policy_document'
  | 'supporting_evidence'
  | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'requires_update';

export interface Assessment {
  id: string;
  assessorId: string;
  score?: number;
  maxScore: number;
  criteria: AssessmentCriteria[];
  findings: string;
  recommendations: string;
  conductedAt: Date;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface AssessmentCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  score?: number;
  maxScore: number;
  evidence?: string;
  notes?: string;
}

export interface ApplicationComment {
  id: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface CertificationTemplate {
  id: string;
  type: CertificationType;
  name: string;
  description: string;
  requiredDocuments: DocumentType[];
  criteria: AssessmentCriteria[];
  validityPeriod: number; // in months
  renewalPeriod: number; // in months before expiry
}
