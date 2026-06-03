/**
 * Shared configuration for the dashboard application.
 * Centralizes environment variables and configuration constants.
 */

// Injected by vite.config.ts at build time from process.env.BOT_API_URL.
declare const __BOT_API_URL__: string

export const BOT_API_URL = __BOT_API_URL__

export const API_TIMEOUT = 30000
export const API_MAX_RETRIES = 3
export const API_RETRY_BASE_DELAY = 1000
