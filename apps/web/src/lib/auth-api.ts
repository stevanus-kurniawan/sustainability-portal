/**
 * Auth API client – user and admin auth with cookie-based sessions.
 * All requests use credentials: 'include' so cookies are sent/received.
 * In the browser we use same-origin /api/v1 so Next.js rewrites to the backend and cookies work.
 */

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api/v1';
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
}

const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

/** Turn network/fetch errors into a clear message for the user. */
function messageForFetchError(err: unknown, fallback: string): string {
  if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message?.includes('fetch'))) {
    return 'Cannot reach the server. Make sure the API is running (e.g. run `pnpm dev` from the project root). If the API does not start, ensure Redis and the database are available (e.g. run `pnpm dev:infra` first).';
  }
  if (err instanceof Error && (err.message === 'Load failed' || err.message?.toLowerCase().includes('network'))) {
    return 'Network error. Check that the API is running on the correct port and that nothing is blocking the connection.';
  }
  return fallback;
}

export interface UserAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
  expiresIn: number;
}

export interface UserRegisterResponse {
  message: string;
}

export interface UserMeResponse {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
}

const backendUnreachableMessage =
  'Cannot reach the API. Start the backend with `pnpm dev` from the project root (and ensure Docker infra is running: `pnpm dev:infra`).';

export async function userLogin(email: string, password: string): Promise<UserAuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      ...defaultOptions,
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    throw new Error(messageForFetchError(err, 'Login failed'));
  }
  if (res.status === 502) {
    throw new Error(backendUnreachableMessage);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Login failed');
  }
  return res.json();
}

export async function userRegister(params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<UserRegisterResponse> {
  const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Registration failed');
  }
  return res.json();
}

export interface VerifyEmailResponse {
  message: string;
}

export async function userVerifyEmail(token: string): Promise<VerifyEmailResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`,
    { ...defaultOptions, method: 'GET' },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Verification failed');
  }
  return res.json();
}

export interface ResendVerificationResponse {
  message: string;
}

export async function resendUserVerification(email: string): Promise<ResendVerificationResponse> {
  const res = await fetch(`${getApiBaseUrl()}/auth/resend-verification`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to send verification email');
  }
  return res.json();
}

export interface ChangeEmailResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export async function userForgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to send reset link');
  }
  return res.json();
}

export interface ResetPasswordResponse {
  message: string;
}

export async function userResetPassword(params: {
  token: string;
  newPassword: string;
}): Promise<ResetPasswordResponse> {
  const res = await fetch(`${getApiBaseUrl()}/auth/reset-password`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to reset password');
  }
  return res.json();
}

export async function changeUserEmail(params: {
  currentEmail: string;
  newEmail: string;
}): Promise<ChangeEmailResponse> {
  const res = await fetch(`${getApiBaseUrl()}/auth/change-email`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to update email address');
  }
  return res.json();
}

export async function userLogout(): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/auth/logout`, {
    ...defaultOptions,
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Logout failed');
  }
}

export async function userMe(): Promise<UserMeResponse | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
    ...defaultOptions,
    method: 'GET',
  });
  if (!res.ok) return null;
  return res.json();
}

export interface AdminAuthResponse {
  admin: { id: string; email: string; role: string };
  expiresIn: number;
}

export interface AdminMeResponse {
  id: string;
  email: string;
  role: string;
  status: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminAuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/admin-auth/login`, {
      ...defaultOptions,
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    throw new Error('Cannot reach the API. If using the proxy, ensure the frontend was built with API_BACKEND_URL and the backend is reachable from the frontend server.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(typeof message === 'string' ? message : 'Admin login failed');
  }
  return data as AdminAuthResponse;
}

export async function adminLogout(): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/admin-auth/logout`, {
    ...defaultOptions,
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Logout failed');
  }
}

export async function adminMe(): Promise<AdminMeResponse | null> {
  const res = await fetch(`${getApiBaseUrl()}/admin-auth/me`, {
    ...defaultOptions,
    method: 'GET',
  });
  if (!res.ok) return null;
  return res.json();
}
