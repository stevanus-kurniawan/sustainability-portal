/**
 * License Constants
 */

import { LicenseType, LicenseStatus, LicenseDocumentType, InspectionType } from '../types';

export const LICENSE_TYPES: Record<LicenseType, { label: string; description: string }> = {
  environmental_permit: {
    label: 'Environmental Permit',
    description: 'General environmental operations permit',
  },
  waste_management: {
    label: 'Waste Management License',
    description: 'License for waste handling and disposal',
  },
  emissions_permit: {
    label: 'Emissions Permit',
    description: 'Air emissions and pollution control permit',
  },
  water_discharge: {
    label: 'Water Discharge Permit',
    description: 'Wastewater and effluent discharge permit',
  },
  hazardous_materials: {
    label: 'Hazardous Materials License',
    description: 'License for handling hazardous substances',
  },
  renewable_energy: {
    label: 'Renewable Energy License',
    description: 'License for renewable energy generation',
  },
  sustainability_reporting: {
    label: 'Sustainability Reporting License',
    description: 'License for sustainability disclosure',
  },
  carbon_trading: {
    label: 'Carbon Trading License',
    description: 'License for carbon credit trading',
  },
  custom: {
    label: 'Custom',
    description: 'Custom License Type',
  },
};

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  pending_payment: 'Pending Payment',
  pending_inspection: 'Pending Inspection',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  suspended: 'Suspended',
  revoked: 'Revoked',
};

export const LICENSE_STATUS_COLORS: Record<LicenseStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  under_review: 'yellow',
  pending_payment: 'orange',
  pending_inspection: 'purple',
  approved: 'green',
  rejected: 'red',
  expired: 'gray',
  suspended: 'orange',
  revoked: 'red',
};

export const LICENSE_DOCUMENT_TYPES: Record<LicenseDocumentType, string> = {
  application_form: 'Application Form',
  site_plan: 'Site Plan',
  environmental_impact: 'Environmental Impact Assessment',
  safety_plan: 'Safety Plan',
  insurance_certificate: 'Insurance Certificate',
  financial_guarantee: 'Financial Guarantee',
  technical_specification: 'Technical Specification',
  compliance_report: 'Compliance Report',
  other: 'Other',
};

export const INSPECTION_TYPES: Record<InspectionType, string> = {
  initial: 'Initial Inspection',
  routine: 'Routine Inspection',
  follow_up: 'Follow-up Inspection',
  complaint: 'Complaint Investigation',
  renewal: 'Renewal Inspection',
};

export const INSPECTION_SEVERITY_COLORS = {
  critical: 'red',
  major: 'orange',
  minor: 'yellow',
  observation: 'blue',
} as const;

export const PAYMENT_TYPES = {
  application_fee: 'Application Fee',
  license_fee: 'License Fee',
  renewal_fee: 'Renewal Fee',
  inspection_fee: 'Inspection Fee',
  penalty: 'Penalty',
} as const;
