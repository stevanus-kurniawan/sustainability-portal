/**
 * Certification DTOs for API communication
 */

import {
  CertificationType,
  CertificationStatus,
  DocumentType,
  DocumentStatus,
} from '../types';
import { PaginationQueryDto } from './common.dto';

export interface CreateCertificationApplicationDto {
  organizationId: string;
  type: CertificationType;
  scope: string;
}

export interface UpdateCertificationApplicationDto {
  scope?: string;
  status?: CertificationStatus;
}

export interface SubmitCertificationApplicationDto {
  applicationId: string;
  declaration: boolean;
}

export interface CertificationDocumentUploadDto {
  applicationId: string;
  name: string;
  type: DocumentType;
  file: File | Blob;
}

export interface UpdateDocumentStatusDto {
  documentId: string;
  status: DocumentStatus;
  comments?: string;
}

export interface CreateAssessmentDto {
  applicationId: string;
  assessorId: string;
  scheduledAt: string;
}

export interface UpdateAssessmentDto {
  score?: number;
  findings?: string;
  recommendations?: string;
  criteria?: {
    criteriaId: string;
    score: number;
    evidence?: string;
    notes?: string;
  }[];
}

export interface CompleteAssessmentDto {
  assessmentId: string;
  overallScore: number;
  findings: string;
  recommendations: string;
  approved: boolean;
}

export interface AddApplicationCommentDto {
  applicationId: string;
  content: string;
  isInternal: boolean;
}

export interface CertificationQueryDto extends PaginationQueryDto {
  organizationId?: string;
  type?: CertificationType;
  status?: CertificationStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApproveCertificationDto {
  applicationId: string;
  validFrom: string;
  validUntil: string;
  conditions?: string[];
}

export interface RejectCertificationDto {
  applicationId: string;
  reason: string;
}

export interface RevokeCertificationDto {
  certificationId: string;
  reason: string;
  effectiveDate: string;
}
