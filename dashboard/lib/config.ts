/**
 * Shared configuration for the dashboard application.
 * Centralizes environment variables and configuration constants.
 */

/**
 * Backend API URL for server-to-server communication and client-side requests.
 * Uses NEXT_PUBLIC_BOT_API_URL environment variable or falls back to localhost.
 */
export const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

/**
 * API request timeout in milliseconds.
 */
export const API_TIMEOUT = 30000;

/**
 * Maximum number of retry attempts for failed API requests.
 */
export const API_MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (in milliseconds).
 */
export const API_RETRY_BASE_DELAY = 1000;
