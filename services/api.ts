/**
 * Centralized API client for all services
 */

import { getStoredToken } from './auth';

export const API_BASE_URL = '/api';

/**
 * Get WebSocket base URL
 * Automatically handles secure/insecure WebSocket protocols
 */
export function getWebSocketBaseUrl(): string {
  // Use root-relative /api because Nginx will route it
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api`;
}

export interface ApiError {
  message: string;
  status: number;
  detail?: string;
}

/**
 * Generic API request handler
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);

  // Default content type to JSON
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = 'Request failed';
      let fullErrorData: any = null;
      try {
        fullErrorData = await response.json();
        errorDetail = fullErrorData.detail || fullErrorData.message || errorDetail;

        // Log full error for debugging
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          endpoint: endpoint,
          fullError: fullErrorData
        });
      } catch {
        // If response is not JSON, use status text
        errorDetail = response.statusText;
      }

      const error: ApiError = {
        message: errorDetail,
        status: response.status,
        detail: errorDetail,
      };
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if ((error as ApiError).status) {
      throw error;
    }

    // Network error or other non-API error
    const apiError: ApiError = {
      message: 'Network error. Please check your connection.',
      status: 0,
      detail: (error as Error).message,
    };
    throw apiError;
  }
}

/**
 * GET request
 */
export async function get<T>(endpoint: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiRequest<T>(endpoint, {
    method: 'GET',
    headers,
  });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  data?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiRequest<T>(endpoint, {
    method: 'POST',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * POST request with Form Data
 */
export async function postForm<T>(
  endpoint: string,
  formData: FormData,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiRequest<T>(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  data?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiRequest<T>(endpoint, {
    method: 'PUT',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  data?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Health check functionality
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
