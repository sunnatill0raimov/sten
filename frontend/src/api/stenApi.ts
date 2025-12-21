// API utility functions for STEN operations

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004/api/sten';

export interface StenData {
  id?: string;
  message: string;
  isPasswordProtected: boolean;
  password?: string;
  expiresIn: string;
  maxWinners: number | null; // null means unlimited
  oneTime?: boolean;
}

export interface StenResponse {
  id: string;
  text?: string;
  expiresAfter?: string;
  maxWinners?: string;
  oneTimeView?: boolean;
  createdAt?: string;
  status?: 'active' | 'solved' | 'expired';
}

export interface CreateStenResponse {
  stenId: string;
  publicUrl: string;
}

export interface SolveAttempt {
  password: string;
}

export interface StenMetadata {
  exists: boolean;
  expired?: boolean;
  reason?: string;
  passwordProtected?: boolean;
  requiresPassword?: boolean;
  remainingViews?: number;
  maxWinners?: number;
  currentWinners?: number;
  oneTime?: boolean;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  destroyed?: boolean;
}

export interface StenContent {
  content: string;
  consumed?: boolean;
  currentWinners?: number;
  solved?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  success?: boolean;
}

// Enhanced error handling with specific error types
export class StenApiError extends Error {
  public code?: string;
  public statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'StenApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Create a new STEN
export const createSten = async (stenData: StenData): Promise<CreateStenResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stenData),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new StenApiError(
        error.message || 'Failed to create STEN',
        error.code,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// NEW: Get STEN metadata (no content)
export const getStenMetadata = async (id: string): Promise<StenMetadata> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/metadata`);

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      // Handle different error scenarios
      if (response.status === 404) {
        throw new StenApiError(
          'STEN not found. It may have been deleted or the link is incorrect.',
          'STEN_NOT_FOUND',
          response.status
        );
      } else if (response.status === 410) {
        throw new StenApiError(
          'This STEN has expired and is no longer available.',
          'STEN_EXPIRED',
          response.status
        );
      }
      
      throw new StenApiError(
        error.message || 'Failed to fetch STEN metadata',
        error.code,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// NEW: Unlock password-protected STEN
export const unlockSten = async (id: string, password: string): Promise<StenContent> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      // Handle specific error codes
      switch (error.code) {
        case 'STEN_NOT_FOUND':
          throw new StenApiError(
            'STEN not found. It may have been deleted or the link is incorrect.',
            error.code,
            response.status
          );
        case 'STEN_EXPIRED':
          throw new StenApiError(
            'This STEN has expired and is no longer available.',
            error.code,
            response.status
          );
        case 'STEN_ALREADY_VIEWED':
          throw new StenApiError(
            'This STEN has already been viewed and is no longer available.',
            error.code,
            response.status
          );
        case 'WINNERS_LIMIT_REACHED':
          throw new StenApiError(
            'The maximum number of views for this STEN has been reached.',
            error.code,
            response.status
          );
        case 'PASSWORD_REQUIRED':
          throw new StenApiError(
            'Password is required to view this STEN.',
            error.code,
            response.status
          );
        case 'INVALID_PASSWORD':
          throw new StenApiError(
            'Incorrect password. Please try again.',
            error.code,
            response.status
          );
        default:
          throw new StenApiError(
            error.message || 'Failed to unlock STEN',
            error.code,
            response.status
          );
      }
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// NEW: View unprotected STEN
export const viewSten = async (id: string): Promise<StenContent> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      // Handle specific error codes
      switch (error.code) {
        case 'STEN_NOT_FOUND':
          throw new StenApiError(
            'STEN not found. It may have been deleted or the link is incorrect.',
            error.code,
            response.status
          );
        case 'STEN_EXPIRED':
          throw new StenApiError(
            'This STEN has expired and is no longer available.',
            error.code,
            response.status
          );
        case 'STEN_ALREADY_VIEWED':
          throw new StenApiError(
            'This STEN has already been viewed and is no longer available.',
            error.code,
            response.status
          );
        case 'WINNERS_LIMIT_REACHED':
          throw new StenApiError(
            'The maximum number of views for this STEN has been reached.',
            error.code,
            response.status
          );
        case 'PASSWORD_REQUIRED':
          throw new StenApiError(
            'This STEN requires a password to view.',
            error.code,
            response.status
          );
        default:
          throw new StenApiError(
            error.message || 'Failed to view STEN',
            error.code,
            response.status
          );
      }
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// Legacy: Get STEN by ID
export const getSten = async (id: string): Promise<StenResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`);

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new StenApiError(
        error.message || 'Failed to fetch STEN',
        error.code,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// Legacy: Get STEN status
export const getStenStatus = async (id: string): Promise<{ status: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/status`);

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new StenApiError(
        error.message || 'Failed to fetch STEN status',
        error.code,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// Legacy: Solve a STEN
export const solveSten = async (id: string, attempt: SolveAttempt): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attempt),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new StenApiError(
        error.message || 'Failed to solve STEN',
        error.code,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};

// Legacy: Get all STENs
export const getAllStens = async (): Promise<StenResponse[]> => {
  try {
    const response = await fetch(API_BASE_URL);

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new StenApiError(
        error.message || 'Failed to fetch STENs',
        error.code,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof StenApiError) {
      throw error;
    }
    throw new StenApiError('Network error: Failed to connect to server');
  }
};
