/**
 * Shared configuration for the dashboard application.
 * Centralizes environment variables and configuration constants.
 */

export const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || 'http://localhost:3001'

export const API_TIMEOUT = 30000
export const API_MAX_RETRIES = 3
export const API_RETRY_BASE_DELAY = 1000
