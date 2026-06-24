// Centralized error handling utility

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for different types of errors
 */
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
  LOCATION_ERROR: 'LOCATION_ERROR',
};

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  AUTH_ERROR: 'Authentication failed. Please log in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  FIRESTORE_ERROR: 'Database operation failed. Please try again.',
  LOCATION_ERROR: 'Location verification failed. Please ensure you are at the correct location.',
};

/**
 * Handle Firestore errors and convert to user-friendly messages
 */
export function handleFirestoreError(error) {
  console.error('Firestore error:', error);
  
  if (!error.code) {
    return {
      success: false,
      error: ERROR_MESSAGES.FIRESTORE_ERROR,
      code: ERROR_CODES.FIRESTORE_ERROR,
    };
  }

  const errorMap = {
    'permission-denied': {
      message: ERROR_MESSAGES.PERMISSION_DENIED,
      code: ERROR_CODES.PERMISSION_DENIED,
    },
    'not-found': {
      message: ERROR_MESSAGES.NOT_FOUND,
      code: ERROR_CODES.NOT_FOUND,
    },
    'unavailable': {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: ERROR_CODES.NETWORK_ERROR,
    },
    'already-exists': {
      message: 'This record already exists.',
      code: ERROR_CODES.VALIDATION_ERROR,
    },
  };

  const mappedError = errorMap[error.code] || {
    message: ERROR_MESSAGES.FIRESTORE_ERROR,
    code: ERROR_CODES.FIRESTORE_ERROR,
  };

  return {
    success: false,
    error: mappedError.message,
    code: mappedError.code,
    originalError: error.message,
  };
}

/**
 * Handle network errors
 */
export function handleNetworkError(error) {
  console.error('Network error:', error);
  
  return {
    success: false,
    error: ERROR_MESSAGES.NETWORK_ERROR,
    code: ERROR_CODES.NETWORK_ERROR,
    originalError: error.message,
  };
}

/**
 * Handle validation errors
 */
export function handleValidationError(errors) {
  console.error('Validation error:', errors);
  
  const errorMessages = Object.values(errors).join(', ');
  
  return {
    success: false,
    error: errorMessages || ERROR_MESSAGES.VALIDATION_ERROR,
    code: ERROR_CODES.VALIDATION_ERROR,
    details: errors,
  };
}

/**
 * Generic error handler that routes to appropriate handler
 */
export function handleError(error) {
  if (error?.code?.startsWith('firestore') || error?.name === 'FirebaseError') {
    return handleFirestoreError(error);
  }
  
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }
  
  if (error instanceof TypeError || error instanceof ReferenceError) {
    return handleNetworkError(error);
  }
  
  // Default error handling
  console.error('Unhandled error:', error);
  return {
    success: false,
    error: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    originalError: error?.message,
  };
}

/**
 * Async wrapper to catch and handle errors consistently
 */
export async function withErrorHandling(asyncFn) {
  try {
    const result = await asyncFn();
    return result;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Log error for debugging (could be extended to send to logging service)
 */
export function logError(error, context = {}) {
  const errorData = {
    message: error?.message,
    code: error?.code,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
  };
  
  console.error('Error logged:', errorData);
  
  // In production, you might send this to a logging service
  // e.g., Sentry, LogRocket, or custom endpoint
}
