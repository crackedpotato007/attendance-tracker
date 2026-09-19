/**
 * Centralized API client for BunkPulse backend (Express + MongoDB)
 * Automatically includes credentials for HTTP-only cookies
 */

const BASE_URL = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  // Dual-layer auth fallback: attach Authorization header if token exists in localStorage
  if (typeof window !== "undefined") {
    const localToken = localStorage.getItem("bunkpulse_token");
    if (localToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${localToken}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Essential for HTTP cookies
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {
      // Non-JSON error response
    }
    throw new ApiError(errorMessage, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: "GET", headers }),

  post: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: "DELETE", headers }),

  // 1. Auth API
  auth: {
    signup: (data: { name: string; email: string; password: string; college?: string }) =>
      api.post<{ user: any; message: string }>("/auth/signup", data),
    login: (data: { email: string; password: string }) =>
      api.post<{ user: any; message: string }>("/auth/login", data),
    me: () =>
      api.get<{ user: any }>("/auth/me"),
    logout: () =>
      api.post<{ message: string }>("/auth/logout"),
  },

  // 2. Subjects API
  subjects: {
    list: () =>
      api.get<any[]>("/subjects"),
    create: (data: any) =>
      api.post<any>("/subjects", data),
    update: (id: string, data: any) =>
      api.put<any>(`/subjects/${id}`, data),
    delete: (id: string) =>
      api.delete<{ message: string }>(`/subjects/${id}`),
    quickLog: (id: string, action: "present" | "absent") =>
      api.post<{ subject?: any; log?: any; alreadyLogged?: boolean; message?: string }>(`/subjects/${id}/quick`, { action }),
  },

  // 3. Attendance Logs API
  attendance: {
    list: (date?: string) =>
      api.get<any[]>(`/attendance${date ? `?date=${date}` : ""}`),
    create: (data: { subjectId: string; subjectName: string; date: string; status: string; note?: string }) =>
      api.post<{ log: any; subject?: any; alreadyLogged?: boolean; message?: string }>("/attendance", data),
    batch: (date: string) =>
      api.post<{ message: string; logs: any[]; subjects: any[] }>("/attendance/batch", { date }),
    delete: (id: string) =>
      api.delete<{ message: string }>(`/attendance/${id}`),
  },

  // 4. Schedule API
  schedule: {
    get: () =>
      api.get<any>("/schedule"),
    update: (data: { activeDays?: number[]; globalTarget?: number; customHolidays?: any[] }) =>
      api.put<any>("/schedule", data),
  },
};
