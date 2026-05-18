/**
 * Global Error Handler
 */

export function handleApiError(error: any) {
  console.error('API Error:', error);

  if (error.response) {
    // Server responded with error status
    return {
      status: error.response.status,
      message: error.response.data?.error || 'An error occurred',
    };
  } else if (error.request) {
    // Request was made but no response
    return {
      status: 503,
      message: 'Service unavailable',
    };
  } else {
    // Error in request setup
    return {
      status: 500,
      message: error.message || 'An error occurred',
    };
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
