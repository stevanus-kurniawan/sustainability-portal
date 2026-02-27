/**
 * Validation Constants
 */

export const VALIDATION = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    // At least 10 characters, incl. upper, lower, number, special
    PATTERN:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/,
  },

  // Email
  EMAIL: {
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // Name fields
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },

  // Organization
  ORGANIZATION: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 200,
    REGISTRATION_NUMBER_PATTERN: /^[A-Z0-9-]{5,50}$/,
  },

  // Phone
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
  },

  // Postal Code (generic)
  POSTAL_CODE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
  },

  // Application
  APPLICATION: {
    SCOPE_MIN_LENGTH: 10,
    SCOPE_MAX_LENGTH: 2000,
    COMMENT_MAX_LENGTH: 1000,
  },

  // Document
  DOCUMENT: {
    NAME_MAX_LENGTH: 255,
    MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  },

  // Assessment
  ASSESSMENT: {
    FINDINGS_MAX_LENGTH: 5000,
    RECOMMENDATIONS_MAX_LENGTH: 5000,
    NOTES_MAX_LENGTH: 1000,
  },

  // License
  LICENSE: {
    NUMBER_PATTERN: /^[A-Z]{2,5}-\d{4,10}$/,
    CONDITION_MAX_LENGTH: 500,
  },

  // Inspection
  INSPECTION: {
    FINDING_DESCRIPTION_MAX_LENGTH: 1000,
    REPORT_MAX_LENGTH: 10000,
  },
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_WEAK:
    'Password must be at least 10 characters and include uppercase, lowercase, number, and special character',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PHONE_INVALID: 'Please enter a valid phone number',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  FILE_TYPE_INVALID: 'File type is not supported',
  DATE_INVALID: 'Please enter a valid date',
  DATE_PAST: 'Date must be in the past',
  DATE_FUTURE: 'Date must be in the future',
  NUMBER_MIN: (min: number) => `Must be at least ${min}`,
  NUMBER_MAX: (max: number) => `Must be no more than ${max}`,
} as const;
