/**
 * API Constants
 */

export const API_VERSION = 'v1';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },

  // Organizations
  ORGANIZATIONS: {
    BASE: '/organizations',
    BY_ID: (id: string) => `/organizations/${id}`,
    MEMBERS: (id: string) => `/organizations/${id}/members`,
  },

  // Certifications
  CERTIFICATIONS: {
    BASE: '/certifications',
    BY_ID: (id: string) => `/certifications/${id}`,
    APPLICATIONS: '/certifications/applications',
    APPLICATION_BY_ID: (id: string) => `/certifications/applications/${id}`,
    SUBMIT: (id: string) => `/certifications/applications/${id}/submit`,
    APPROVE: (id: string) => `/certifications/applications/${id}/approve`,
    REJECT: (id: string) => `/certifications/applications/${id}/reject`,
    DOCUMENTS: (id: string) => `/certifications/applications/${id}/documents`,
    ASSESSMENTS: (id: string) => `/certifications/applications/${id}/assessments`,
    COMMENTS: (id: string) => `/certifications/applications/${id}/comments`,
    TEMPLATES: '/certifications/templates',
  },

  // Licenses
  LICENSES: {
    BASE: '/licenses',
    BY_ID: (id: string) => `/licenses/${id}`,
    APPLICATIONS: '/licenses/applications',
    APPLICATION_BY_ID: (id: string) => `/licenses/applications/${id}`,
    SUBMIT: (id: string) => `/licenses/applications/${id}/submit`,
    APPROVE: (id: string) => `/licenses/applications/${id}/approve`,
    REJECT: (id: string) => `/licenses/applications/${id}/reject`,
    DOCUMENTS: (id: string) => `/licenses/applications/${id}/documents`,
    INSPECTIONS: (id: string) => `/licenses/applications/${id}/inspections`,
    PAYMENTS: (id: string) => `/licenses/applications/${id}/payments`,
    CONDITIONS: (id: string) => `/licenses/applications/${id}/conditions`,
    COMMENTS: (id: string) => `/licenses/applications/${id}/comments`,
    TEMPLATES: '/licenses/templates',
    SUSPEND: (id: string) => `/licenses/${id}/suspend`,
    REVOKE: (id: string) => `/licenses/${id}/revoke`,
    RENEW: (id: string) => `/licenses/${id}/renew`,
  },

  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_ACTIVITIES: '/dashboard/activities',
    NOTIFICATIONS: '/dashboard/notifications',
  },

  // Reports
  REPORTS: {
    BASE: '/reports',
    GENERATE: '/reports/generate',
    DOWNLOAD: (id: string) => `/reports/${id}/download`,
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
