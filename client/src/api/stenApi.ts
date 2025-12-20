// API utility functions for STEN operations

const API_BASE_URL = 'http://localhost:3004/api/sten';

export interface StenData {
  id?: string;
  message: string;
  isPasswordProtected: boolean;
  password?: string;
  expiresAt: Date;
  maxWinners: number;
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

// Create a new STEN
export const createSten = async (stenData: StenData): Promise<CreateStenResponse> => {
  const response = await fetch(`${API_BASE_URL}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stenData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create STEN');
  }

  return response.json();
};

// Get STEN by ID
export const getSten = async (id: string): Promise<StenResponse> => {
  const response = await fetch(`${API_BASE_URL}/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch STEN');
  }

  return response.json();
};

// Get STEN status
export const getStenStatus = async (id: string): Promise<{ status: string }> => {
  const response = await fetch(`${API_BASE_URL}/${id}/status`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch STEN status');
  }

  return response.json();
};

// Solve a STEN
export const solveSten = async (id: string, attempt: SolveAttempt): Promise<{ success: boolean; message?: string }> => {
  const response = await fetch(`${API_BASE_URL}/${id}/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(attempt),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to solve STEN');
  }

  return response.json();
};

// Get all STENs
export const getAllStens = async (): Promise<StenResponse[]> => {
  const response = await fetch(API_BASE_URL);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch STENs');
  }

  return response.json();
};
