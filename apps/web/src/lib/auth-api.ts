/**
 * Auth API client – user and admin auth with cookie-based sessions.
 * All requests use credentials: 'include' so cookies are sent/received.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

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

export async function userLogin(email: string, password: string): Promise<UserAuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
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

export interface ResendVerificationResponse {
  message: string;
}

export async function resendUserVerification(email: string): Promise<ResendVerificationResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
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

export async function changeUserEmail(params: {
  currentEmail: string;
  newEmail: string;
}): Promise<ChangeEmailResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/change-email`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    ...defaultOptions,
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Logout failed');
  }
}

export async function userMe(): Promise<UserMeResponse | null> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
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
    res = await fetch(`${API_BASE_URL}/admin-auth/login`, {
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
  const res = await fetch(`${API_BASE_URL}/admin-auth/logout`, {
    ...defaultOptions,
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Logout failed');
  }
}

export async function adminMe(): Promise<AdminMeResponse | null> {
  const res = await fetch(`${API_BASE_URL}/admin-auth/me`, {
    ...defaultOptions,
    method: 'GET',
  });
  if (!res.ok) return null;
  return res.json();
}
