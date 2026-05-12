/**
 * API client with automatic credential inclusion for HTTPOnly cookies
 * All requests to the backend API will automatically include auth cookies
 */

interface FetchOptions extends RequestInit {
  // Standard fetch options
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const url = new URL(endpoint, baseUrl).toString();

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // 🔒 Include cookies automatically
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
