export const API_URL = getApiUrl();

function getApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:4000`;
    }
    console.error(
      "NEXT_PUBLIC_API_URL is missing. In Vercel, set it to your Render API URL (e.g. https://your-app.onrender.com)."
    );
  }

  return "http://localhost:4000";
}

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type ApiError = {
  error?: string;
  code?: string;
  details?: Record<string, string[] | undefined>;
};

export class ApiRequestError extends Error {
  code?: string;
  status: number;
  details?: Record<string, string[] | undefined>;

  constructor(message: string, status: number, code?: string, details?: Record<string, string[] | undefined>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildHeaders(initHeaders: HeadersInit = {}) {
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function parseResponse<T>(response: Response) {
  return response.json().catch(() => ({})) as Promise<T & ApiError>;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestWithAuth<T>(path, init);
}

async function refreshAuthSession(): Promise<AuthSession> {
  const session = readSession();
  if (!session?.refreshToken) {
    throw new Error("Session refresh not available");
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken })
  });

  if (!response.ok) {
    clearSession();
    const errorData = (await parseResponse<ApiError>(response))?.error;
    throw new Error(errorData ?? "Unable to refresh session");
  }

  const data = await response.json() as { accessToken: string; refreshToken: string };
  const updatedSession = {
    ...session,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken
  };
  writeSession(updatedSession);
  return updatedSession;
}

async function requestWithAuth<T>(path: string, init: RequestInit, retry = false): Promise<T> {
  const session = readSession();
  const headers = buildHeaders(init.headers || {});
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
  });

  if (response.status === 401 && !retry && session?.refreshToken) {
    try {
      const refreshed = await refreshAuthSession();
      const retryHeaders = buildHeaders(init.headers || {});
      retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
      const retryResponse = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: retryHeaders
      });
      const retryData = await parseResponse<T>(retryResponse);
      if (!retryResponse.ok) {
        throw new Error((retryData as ApiError)?.error ?? "Request failed");
      }
      return retryData;
    } catch (err) {
      throw err;
    }
  }

  const data = await parseResponse<T & ApiError>(response);
  if (!response.ok) {
    throw new ApiRequestError(data.error ?? "Request failed", response.status, data.code, data.details);
  }
  return data;
}

export async function logoutSession() {
  const session = readSession();
  if (session?.refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken })
      });
    } catch {
      // ignore logout failures
    }
  }

  clearSession();
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("truevesti.session");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem("truevesti.session");
    return null;
  }
}

export function writeSession(session: AuthSession) {
  window.localStorage.setItem("truevesti.session", JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem("truevesti.session");
}
