/**
 * Standardized API response helpers for consistent error handling and responses
 */

import { Response } from 'express';
import { logger, getErrorMessage } from './logger.js';

/**
 * Standard success response
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Send a success response with data wrapper
 */
export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data } as SuccessResponse<T>);
}

/**
 * Send a success response with custom shape (for backward compatibility)
 * Use when API contract requires specific response structure
 */
export function sendOk<T extends Record<string, unknown>>(res: Response, body: T, status = 200): Response {
  return res.status(status).json({ success: true, ...body });
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

/**
 * Send an error response (client error)
 */
export function sendError(res: Response, error: string, status = 400): Response {
  return res.status(status).json({ success: false, error } as ErrorResponse);
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(res: Response, resource = 'Resource'): Response {
  return sendError(res, `${resource} not found`, 404);
}

/**
 * Send an unauthorized error (401)
 */
export function sendUnauthorized(res: Response, message = 'Unauthorized'): Response {
  return sendError(res, message, 401);
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(res: Response, message = 'Access denied'): Response {
  return sendError(res, message, 403);
}

/**
 * Send a server error with logging (500)
 */
export function sendServerError(res: Response, error: unknown, context: string): Response {
  logger.error(`${context}:`, getErrorMessage(error));
  return sendError(res, `Failed to ${context.toLowerCase()}`, 500);
}

/**
 * Handle a service result and send appropriate response
 * Useful for service functions that return { success, data?, error? }
 */
export function handleServiceResult<T>(
  res: Response,
  result: { success: boolean; data?: T; error?: string },
  notFoundMessage = 'Resource not found'
): Response {
  if (!result.success) {
    const error = result.error || 'Operation failed';
    // Determine status code based on error message
    if (error.toLowerCase().includes('not found')) {
      return sendNotFound(res, notFoundMessage);
    }
    if (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('permission')) {
      return sendForbidden(res, error);
    }
    return sendError(res, error);
  }
  return sendSuccess(res, result.data);
}
