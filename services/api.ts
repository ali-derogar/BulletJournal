/**
 * API Client for backend communication
 * Handles base configuration and request/response formatting
 */

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Note: NEXT_PUBLIC_API_URL should be set correctly in .env.local
// Development: http://localhost:8000
// Production: http://your-server-ip:8000

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

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorDetail = 'Request failed';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
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
  data?: unknown,
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
 * POST request with form data (for OAuth2 password flow)
 */
export async function postForm<T>(
  endpoint: string,
  data: Record<string, string>
): Promise<T> {
  const formData = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return apiRequest<T>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: unknown,
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
 * Check if backend is reachable
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
