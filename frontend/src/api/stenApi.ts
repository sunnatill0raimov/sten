// API utility functions for STEN operations

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004/api/sten'

export interface StenData {
	id?: string
	title: string
	description?: string
	prize?: string
	message: string
	logoUrl?: string
	isPasswordProtected: boolean
	password?: string
	expiresIn: string // '1_hour', '24_hours', '7_days', '30_days'
}

export interface StenResponse {
	id: string
	title?: string
	content?: string
	expiresAt?: string
	maxViews?: number | null
	currentViews?: number
	createdAt?: string
	status?: 'active' | 'expired' | 'views_reached'
	isPasswordProtected?: boolean
}

export interface CreateStenResponse {
	link: string
	password?: string // Only included if password-protected
	qrCode?: string | null // Base64 encoded QR code image
	logoUrl?: string | null
	attachmentUrl?: string | null
	attachmentName?: string | null
	attachmentType?: string | null
}

export interface StenContent {
	content: string
}

export interface StenMetadata {
	exists: boolean
	expired?: boolean
	isPasswordProtected?: boolean
	viewsRemaining?: number | 'unlimited'
	maxViews?: number | null
	currentViews?: number
	expiresAt?: string
	createdAt?: string
	title?: string
	description?: string
	prize?: string
	logoUrl?: string
	attachmentUrl?: string | null
	attachmentName?: string | null
	attachmentType?: string | null
	qrCode?: string | null
	charCount?: number
	code?: string
	reason?: string
	destroyed?: boolean
	requiresPassword?: boolean
	oneTime?: boolean
}

export interface ApiError {
	message: string
	code?: string
	details?: string
}

// Enhanced error handling with specific error types
export class StenApiError extends Error {
	public code?: string
	public statusCode?: number

	constructor(message: string, code?: string, statusCode?: number) {
		super(message)
		this.name = 'StenApiError'
		this.code = code
		this.statusCode = statusCode
	}
}

/**
 * Create a new STEN
 * Returns single link with optional plain password for Ready Page
 */
export const createSten = async (
	stenData: StenData | FormData
): Promise<CreateStenResponse> => {
	try {
		const headers: Record<string, string> = {}

		// Don't set Content-Type header for FormData - let browser set it with boundary
		if (!(stenData instanceof FormData)) {
			headers['Content-Type'] = 'application/json'
		}

		const response = await fetch(`${API_BASE_URL}`, {
			method: 'POST',
			headers,
			body: stenData instanceof FormData ? stenData : JSON.stringify(stenData),
		})

		if (!response.ok) {
			const error: ApiError = await response.json()
			throw new StenApiError(
				error.message || 'Failed to create STEN',
				error.code,
				response.status
			)
		}

		return response.json()
	} catch (error) {
		if (error instanceof StenApiError) {
			throw error
		}
		throw new StenApiError('Network error: Failed to connect to server')
	}
}

/**
 * View/Access a STEN
 * Handles both password-protected and unprotected stens
 */
export const viewSten = async (
	id: string,
	password?: string
): Promise<StenContent> => {
	try {
		const response = await fetch(`${API_BASE_URL}/${id}/view`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ password }),
		})

		if (!response.ok) {
			const error: ApiError = await response.json()

			// Handle specific error codes
			switch (error.code) {
				case 'STEN_NOT_FOUND':
					throw new StenApiError(
						'STEN not found. It may have been deleted or the link is incorrect.',
						error.code,
						response.status
					)
				case 'STEN_EXPIRED':
					throw new StenApiError(
						'This STEN has expired and is no longer available.',
						error.code,
						response.status
					)
				case 'VIEWS_LIMIT_REACHED':
					throw new StenApiError(
						'The maximum number of views for this STEN has been reached.',
						error.code,
						response.status
					)
				case 'PASSWORD_REQUIRED':
					throw new StenApiError(
						'Password is required to view this STEN.',
						error.code,
						response.status
					)
				case 'INVALID_PASSWORD':
					throw new StenApiError(
						'Incorrect password. Please try again.',
						error.code,
						response.status
					)
				case 'RATE_LIMITED':
					throw new StenApiError(
						'Too many password attempts. Try again later.',
						error.code,
						response.status
					)
				default:
					throw new StenApiError(
						error.message || 'Failed to view STEN',
						error.code,
						response.status
					)
			}
		}

		return response.json()
	} catch (error) {
		if (error instanceof StenApiError) {
			throw error
		}
		throw new StenApiError('Network error: Failed to connect to server')
	}
}

/**
 * Unlock a STEN (alias for viewSten with password)
 */
export const unlockSten = async (
	id: string,
	password: string
): Promise<StenContent> => {
	return viewSten(id, password)
}

/**
 * Get STEN metadata (no content)
 */
export const getStenMetadata = async (id: string): Promise<StenMetadata> => {
	try {
		const response = await fetch(`${API_BASE_URL}/${id}`)

		if (!response.ok) {
			const error: ApiError = await response.json()

			// Handle different error scenarios
			if (response.status === 404) {
				throw new StenApiError(
					'STEN not found. It may have been deleted or the link is incorrect.',
					'STEN_NOT_FOUND',
					response.status
				)
			}

			throw new StenApiError(
				error.message || 'Failed to fetch STEN metadata',
				error.code,
				response.status
			)
		}

		return response.json()
	} catch (error) {
		if (error instanceof StenApiError) {
			throw error
		}
		throw new StenApiError('Network error: Failed to connect to server')
	}
}

// Legacy endpoints (keeping for backward compatibility but simplified)

/**
 * Legacy: Solve a STEN - redirects to viewSten
 */
export const solveSten = async (
	id: string,
	password?: string
): Promise<StenContent> => {
	return viewSten(id, password)
}

/**
 * Legacy: Get STEN by ID - redirects to getStenMetadata
 */
export const getSten = async (id: string): Promise<StenMetadata> => {
	return getStenMetadata(id)
}

/**
 * Legacy: Get STEN status
 */
export const getStenStatus = async (
	id: string
): Promise<{ status: string }> => {
	try {
		const metadata = await getStenMetadata(id)
		let status = 'active'

		if (metadata.expired) {
			status = 'expired'
		} else if (
			typeof metadata.viewsRemaining === 'number' &&
			metadata.viewsRemaining <= 0
		) {
			status = 'views_reached'
		}

		return { status }
	} catch (error) {
		if (error instanceof StenApiError) {
			if (error.code === 'STEN_NOT_FOUND') {
				return { status: 'not_found' }
			}
		}
		throw error
	}
}

/**
 * Legacy: Get all STENs
 */
export const getAllStens = async (): Promise<StenResponse[]> => {
	try {
		const response = await fetch(API_BASE_URL)

		if (!response.ok) {
			const error: ApiError = await response.json()
			throw new StenApiError(
				error.message || 'Failed to fetch STENs',
				error.code,
				response.status
			)
		}

		return response.json()
	} catch (error) {
		if (error instanceof StenApiError) {
			throw error
		}
		throw new StenApiError('Network error: Failed to connect to server')
	}
}
