import { AppError, NetworkError, AuthError } from '@shared/utils/error';
import { logger } from '@shared/utils/logger';
import env from '@config/env';

/**
 * Standard API Client Wrapper.
 * 
 * Enforces standard error handling, request formatting, and prevents
 * direct usage of raw fetch() or direct Supabase client calls within UI components.
 * Features should use this client for all network interactions.
 */

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Usually points to our API gateway or edge functions
    this.baseUrl = env.supabaseUrl ? `${env.supabaseUrl}/functions/v1` : '/api';
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;

    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    // Attach auth headers dynamically from the auth store if available
    // We dynamically import to avoid circular dependency loops during initialization
    const { useAuthStore } = await import('@features/auth/stores/auth.store');
    const token = useAuthStore.getState().session?.accessToken;

    const config: RequestInit = {
      ...customConfig,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Session expired. Please log in again.');
        }

        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new AppError(
          errorData.code || 'API_ERROR',
          errorData.message || 'An error occurred while fetching data.',
          errorData.details
        );
      }

      // 204 No Content
      if (response.status === 204) {
        return null as unknown as T;
      }

      return await response.json() as T;
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`API request failed: ${url}`, error);
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed.'
      );
    }
  }

  // ── Convenience Methods ─────────────────────────────────
  
  public get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public patch<T>(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
