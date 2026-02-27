/**
 * Section-specific copy and banner for Procedure, Sustainability, and Compliance.
 * Gives each section its own menu identity, explanation, and optional banner image
 * (same behavior as Policy, License, Certificate).
 */

export interface SectionConfig {
  title: string;
  description: string;
  /** Path to banner image under public/ (e.g. /banners/sop.jpg). Optional. */
  bannerImage?: string;
}

const SECTION_CONFIG: Record<string, SectionConfig> = {
  // Procedure
  'procedure/sop': {
    title: 'Standard Operating Procedures (SOP)',
    description:
      'Our Standard Operating Procedures define how we carry out key sustainability and operational processes. Browse and download SOP documents to understand our practices and controls.',
    bannerImage: '/banners/section-procedure.svg',
  },
  'procedure/forms': {
    title: 'Forms',
    description:
      'Forms and templates used for reporting, audits, and sustainability data collection. Here you can find and download the forms required for submissions, assessments, and record-keeping. Use the links below to open or download each form.',
    bannerImage: '/banners/section-procedure.svg',
  },
  'procedure/form': {
    title: 'Forms',
    description:
      'Forms and templates used for reporting, audits, and sustainability data collection. Here you can find and download the forms required for submissions, assessments, and record-keeping. Use the links below to open or download each form.',
    bannerImage: '/banners/section-procedure.svg',
  },
  // Sustainability
  'sustainability/certificate': {
    title: 'Certifications',
    description:
      'Our sustainability certifications and third-party verifications. Select a site below to view certificates.',
    bannerImage: '/banners/section-sustainability.svg',
  },
  'sustainability/sustainability-report': {
    title: 'Sustainability Report',
    description:
      'Our sustainability reports document environmental, social, and governance performance. Access annual and thematic reports to see progress and commitments.',
    bannerImage: '/banners/section-sustainability.svg',
  },
  // Compliance
  'compliance/national': {
    title: 'National Compliance',
    description:
      'Documents and evidence related to national regulations and local compliance requirements. Find permits, notifications, and regulatory submissions.',
    bannerImage: '/banners/section-compliance.svg',
  },
  'compliance/international': {
    title: 'International Compliance',
    description:
      'International standards, cross-border requirements, and global compliance documentation. Access treaties, conventions, and international framework alignments.',
    bannerImage: '/banners/section-compliance.svg',
  },
  'compliance/standard': {
    title: 'Standards Compliance',
    description:
      'Alignment with voluntary and industry standards (ISO, GRI, etc.). View our standards-based documentation and verification materials.',
    bannerImage: '/banners/section-compliance.svg',
  },
  'compliance/licenses': {
    title: 'Licenses',
    description:
      'Operating licenses and regulatory permits. Select a site below to view licenses and documents.',
    bannerImage: '/banners/section-compliance.svg',
  },
  'compliance/license': {
    title: 'Licenses',
    description:
      'Operating licenses and regulatory permits. Select a site below to view licenses and documents.',
    bannerImage: '/banners/section-compliance.svg',
  },
};

export function getSectionConfig(menuGroup: string, sectionSlug: string): SectionConfig | null {
  const key = `${menuGroup}/${sectionSlug}`;
  return SECTION_CONFIG[key] ?? null;
}

export function getSectionConfigOrDefault(
  menuGroup: string,
  sectionSlug: string,
  fallbackTitle: string,
  fallbackDescription: string
): SectionConfig {
  const config = getSectionConfig(menuGroup, sectionSlug);
  if (config) return config;
  return {
    title: fallbackTitle,
    description: fallbackDescription,
  };
}
