/**
 * Certification Constants
 */

import { CertificationStatus, CertificationType, DocumentStatus, DocumentType } from '../types';

export const CERTIFICATION_TYPES: Record<CertificationType, { label: string; description: string }> = {
  iso_14001: {
    label: 'ISO 14001',
    description: 'Environmental Management System',
  },
  iso_50001: {
    label: 'ISO 50001',
    description: 'Energy Management System',
  },
  leed: {
    label: 'LEED',
    description: 'Leadership in Energy and Environmental Design',
  },
  breeam: {
    label: 'BREEAM',
    description: 'Building Research Establishment Environmental Assessment Method',
  },
  energy_star: {
    label: 'Energy Star',
    description: 'EPA Energy Efficiency Certification',
  },
  green_seal: {
    label: 'Green Seal',
    description: 'Environmental Certification for Products and Services',
  },
  carbon_neutral: {
    label: 'Carbon Neutral',
    description: 'Carbon Neutrality Certification',
  },
  b_corp: {
    label: 'B Corp',
    description: 'Certified B Corporation',
  },
  custom: {
    label: 'Custom',
    description: 'Custom Certification Type',
  },
};

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  pending_documents: 'Pending Documents',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  revoked: 'Revoked',
};

export const CERTIFICATION_STATUS_COLORS: Record<CertificationStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  under_review: 'yellow',
  pending_documents: 'orange',
  approved: 'green',
  rejected: 'red',
  expired: 'gray',
  revoked: 'red',
};

export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  application_form: 'Application Form',
  financial_statement: 'Financial Statement',
  environmental_report: 'Environmental Report',
  audit_report: 'Audit Report',
  policy_document: 'Policy Document',
  supporting_evidence: 'Supporting Evidence',
  other: 'Other',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  requires_update: 'Requires Update',
};

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
