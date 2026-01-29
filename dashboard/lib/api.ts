import { getAuthHeaders, removeAuthToken } from './auth';
import { BOT_API_URL, API_MAX_RETRIES, API_RETRY_BASE_DELAY, API_TIMEOUT } from './config';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Performs a fetch request with automatic retry on network failures.
 * Uses exponential backoff: 1s, 2s, 4s for retries.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = API_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network errors, not on successful responses
      if (attempt < maxRetries - 1) {
        const delay = API_RETRY_BASE_DELAY * Math.pow(2, attempt);
        console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new ApiError(0, lastError?.message || 'Network request failed after retries');
}

/**
 * Safely parses JSON response with error handling.
 * Returns a default value if parsing fails.
 */
async function safeJsonParse<T>(response: Response, defaultValue: T): Promise<T> {
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return defaultValue;
    }
    return JSON.parse(text) as T;
  } catch {
    return defaultValue;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Token expired or invalid
    removeAuthToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (response.status === 429) {
    throw new ApiError(429, 'Rate limited. Please wait before trying again.');
  }

  if (!response.ok) {
    const error = await safeJsonParse<{ error?: string; message?: string }>(response, { error: 'Request failed' });
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return safeJsonParse<T>(response, {} as T);
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetchWithRetry(`${BOT_API_URL}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await fetchWithRetry(`${BOT_API_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: data ? JSON.stringify(data) : undefined,
    cache: 'no-store',
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await fetchWithRetry(`${BOT_API_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: data ? JSON.stringify(data) : undefined,
    cache: 'no-store',
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await fetchWithRetry(`${BOT_API_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse<T>(response);
}

// Re-export config for convenience
export { BOT_API_URL } from './config';
