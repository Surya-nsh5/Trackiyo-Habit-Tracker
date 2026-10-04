import { AxiosError } from 'axios';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface NormalizedApiError {
  status: number | null;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  isRecoverable: boolean;
}

// Patterns that identify internal DB / system errors that must NEVER be exposed to users
const SENSITIVE_ERROR_PATTERNS = [
  /postgres/i,
  /supabase/i,
  /relation.*does not exist/i,
  /column.*does not exist/i,
  /syntax error/i,
  /duplicate key value violates unique constraint/i,
  /violates foreign key/i,
  /sql/i,
  /database error/i,
  /internal server/i,
  /at (Object|Function|async)/i,
  /token expired/i,
  /jwt/i
];

function isSensitive(msg: string): boolean {
  return SENSITIVE_ERROR_PATTERNS.some(pattern => pattern.test(msg));
}

/**
 * Normalizes any caught error (AxiosError, Error, string, or unknown) into a
 * safe, consistent, and user-friendly error object.
 */
export function normalizeApiError(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): NormalizedApiError {
  if (!error) {
    return {
      status: null,
      code: 'UNKNOWN',
      message: fallbackMessage,
      isRecoverable: true
    };
  }

  // Handle AxiosError
  if (typeof error === 'object' && error !== null && (error as any).isAxiosError) {
    const axiosErr = error as AxiosError<any>;
    const status = axiosErr.response?.status || null;
    const responseData = axiosErr.response?.data;

    // Check client-side network and timeout codes
    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
      return {
        status,
        code: 'TIMEOUT',
        message: 'The request took too long to respond. Please check your connection and try again.',
        isRecoverable: true
      };
    }

    if (axiosErr.code === 'ERR_NETWORK' || !axiosErr.response) {
      return {
        status: null,
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        isRecoverable: true
      };
    }

    // Extract message from response if provided by backend
    let rawMsg: string | null = null;
    if (typeof responseData === 'string') {
      rawMsg = responseData;
    } else if (responseData && typeof responseData === 'object') {
      rawMsg = responseData.error || responseData.message || null;
    }

    // Sanitize any raw backend message
    const cleanMsg = rawMsg && !isSensitive(rawMsg) ? rawMsg.trim() : null;

    // Specific HTTP Status Code Handlers
    switch (status) {
      case 400: {
        return {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: cleanMsg || 'Invalid request. Please check your information and try again.',
          fieldErrors: responseData?.fieldErrors,
          isRecoverable: true
        };
      }
      case 401: {
        const isLogin = axiosErr.config?.url?.includes('/auth/login');
        const isSignup = axiosErr.config?.url?.includes('/auth/signup');
        const msg = isLogin
          ? 'Incorrect email or password. Please try again.'
          : isSignup
            ? 'Authentication failed. Please verify your credentials.'
            : (cleanMsg || 'Your session has expired. Please sign in again.');

        return {
          status: 401,
          code: 'UNAUTHORIZED',
          message: msg,
          isRecoverable: false
        };
      }
      case 403: {
        return {
          status: 403,
          code: 'FORBIDDEN',
          message: cleanMsg || 'You do not have permission to perform this action.',
          isRecoverable: false
        };
      }
      case 404: {
        return {
          status: 404,
          code: 'NOT_FOUND',
          message: cleanMsg || 'The requested resource was not found.',
          isRecoverable: false
        };
      }
      case 409: {
        return {
          status: 409,
          code: 'CONFLICT',
          message: cleanMsg || 'A conflict occurred. This record may already exist.',
          isRecoverable: true
        };
      }
      case 422: {
        return {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: cleanMsg || 'Some information provided is invalid. Please review and try again.',
          fieldErrors: responseData?.fieldErrors,
          isRecoverable: true
        };
      }
      case 429: {
        return {
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and try again in a moment.',
          isRecoverable: true
        };
      }
      case 500:
      case 502:
      case 503:
      case 504: {
        return {
          status,
          code: 'SERVER_ERROR',
          message: 'Trackiyo is temporarily unavailable. Please try again shortly.',
          isRecoverable: true
        };
      }
      default: {
        return {
          status,
          code: 'UNKNOWN',
          message: cleanMsg || fallbackMessage,
          isRecoverable: true
        };
      }
    }
  }

  // Handle standard JavaScript Error
  if (error instanceof Error) {
    const isNetwork = error.message.includes('Network') || error.message.includes('Failed to fetch');
    if (isNetwork) {
      return {
        status: null,
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection.',
        isRecoverable: true
      };
    }
    const cleanMsg = !isSensitive(error.message) ? error.message : fallbackMessage;
    return {
      status: null,
      code: 'UNKNOWN',
      message: cleanMsg,
      isRecoverable: true
    };
  }

  return {
    status: null,
    code: 'UNKNOWN',
    message: typeof error === 'string' && !isSensitive(error) ? error : fallbackMessage,
    isRecoverable: true
  };
}

/**
 * Convenient helper to extract a single clean, user-facing error message string.
 */
export function getFriendlyErrorMessage(error: unknown, fallbackMessage?: string): string {
  return normalizeApiError(error, fallbackMessage).message;
}
