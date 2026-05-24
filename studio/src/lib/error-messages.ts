/**
 * User-friendly error messages
 * Provides specific, actionable guidance instead of generic errors
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry',
  },
  TIMEOUT: {
    title: 'Request Timeout',
    message: 'The request took too long to complete. This might be due to slow internet or server issues.',
    action: 'Try Again',
  },
  OFFLINE: {
    title: 'You\'re Offline',
    message: 'No internet connection detected. Please connect to the internet to continue.',
    action: 'Dismiss',
  },
  
  // Rate limiting
  RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'You\'ve reached your daily limit. Please wait a moment or upgrade to premium for unlimited access.',
    action: 'Upgrade',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Daily Limit Reached',
    message: 'You\'ve used all your free messages for today. Come back tomorrow or upgrade to premium.',
    action: 'View Plans',
  },
  
  // Authentication
  AUTH_REQUIRED: {
    title: 'Sign In Required',
    message: 'Please sign in to access this feature.',
    action: 'Sign In',
  },
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired for security reasons. Please sign in again.',
    action: 'Sign In',
  },
  INVALID_CREDENTIALS: {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect. Please try again.',
    action: 'Retry',
  },
  
  // Validation
  INVALID_INPUT: {
    title: 'Invalid Input',
    message: 'Please check your input and make sure all required fields are filled correctly.',
    action: 'Review',
  },
  MISSING_REQUIRED_FIELD: {
    title: 'Missing Information',
    message: 'Please fill in all required fields before continuing.',
    action: 'OK',
  },
  
  // Server errors
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Our team has been notified and is working on it.',
    action: 'Try Again Later',
  },
  SERVICE_UNAVAILABLE: {
    title: 'Service Temporarily Unavailable',
    message: 'The service is temporarily down for maintenance. Please try again in a few minutes.',
    action: 'OK',
  },
  
  // Content errors
  CONTENT_NOT_FOUND: {
    title: 'Content Not Found',
    message: 'The content you\'re looking for doesn\'t exist or has been removed.',
    action: 'Go Back',
  },
  CONTENT_GENERATION_FAILED: {
    title: 'Generation Failed',
    message: 'We couldn\'t generate the content. Please try again with different parameters.',
    action: 'Retry',
  },
  
  // Permission errors
  PERMISSION_DENIED: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this resource.',
    action: 'Go Back',
  },
  FEATURE_NOT_AVAILABLE: {
    title: 'Feature Not Available',
    message: 'This feature is only available to premium users. Upgrade to unlock it.',
    action: 'Upgrade',
  },
  
  // Generic fallback
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Try Again',
  },
} as const

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: any): typeof ERROR_MESSAGES[ErrorMessageKey] {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  
  // Check if error has a status code
  if (error.status) {
    switch (error.status) {
      case 401:
        return ERROR_MESSAGES.AUTH_REQUIRED
      case 403:
        return ERROR_MESSAGES.PERMISSION_DENIED
      case 404:
        return ERROR_MESSAGES.CONTENT_NOT_FOUND
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR
      case 504:
        return ERROR_MESSAGES.TIMEOUT
    }
  }
  
  // Check error message
  if (error.message) {
    const msg = error.message.toLowerCase()
    
    if (msg.includes('network') || msg.includes('connection')) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
    if (msg.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT
    }
    if (msg.includes('offline') || msg.includes('internet')) {
      return ERROR_MESSAGES.OFFLINE
    }
    if (msg.includes('rate limit')) {
      return ERROR_MESSAGES.RATE_LIMIT
    }
    if (msg.includes('session') || msg.includes('expired')) {
      return ERROR_MESSAGES.SESSION_EXPIRED
    }
    if (msg.includes('invalid') || msg.includes('validation')) {
      return ERROR_MESSAGES.INVALID_INPUT
    }
  }
  
  // Fallback
  return ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Format error for toast notification
 */
export function formatErrorForToast(error: any) {
  const errorMsg = getErrorMessage(error)
  
  return {
    title: errorMsg.title,
    description: errorMsg.message,
    variant: 'destructive' as const,
  }
}

// Made with Bob
