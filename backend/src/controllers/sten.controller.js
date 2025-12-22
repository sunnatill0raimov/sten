import Sten from '../models/Sten.js'
import Encryption from '../utils/crypto/encryption.js'
import Crypto, { hashPasswordOnly } from '../utils/crypto/index.js'

// Rate limiting map for brute-force protection
const attemptCounts = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

/**
 * Get all stens (admin endpoint)
 */
export const getAll = async (req, res) => {
	try {
		const stens = await Sten.find()
		
		const response = stens.map(sten => ({
			_id: sten._id,
			title: sten.title,
			maxViews: sten.maxViews,
			currentViews: sten.currentViews,
			expiresAt: sten.expiresAt,
			createdAt: sten.createdAt,
			isPasswordProtected: sten.isPasswordProtected,
		}))
		
		res.json(response)
	} catch (error) {
		console.error('Get all stens error:', error.message)
		res.status(500).json({ message: error.message })
	}
}

/**
 * Create a new Sten
 * Returns single link with optional plain password for Ready Page
 */
export const createSten = async (req, res) => {
	try {
		console.log('📥 [CREATE STEN] Incoming request:', JSON.stringify(req.body, null, 2))
		
		const {
			title,
			message,
			isPasswordProtected,
			password,
			expiresIn = '24_hours',
			maxViews = 1
		} = req.body

		// Validate required fields
		if (!message || typeof message !== 'string' || message.trim().length === 0) {
			return res.status(400).json({ error: 'Message is required' })
		}

		// Validate password protection
		if (typeof isPasswordProtected !== 'boolean') {
			return res.status(400).json({ error: 'isPasswordProtected must be a boolean' })
		}

		// Validate password if protected
		if (isPasswordProtected) {
			if (!password || typeof password !== 'string') {
				return res.status(400).json({ error: 'Password is required for password-protected stens' })
			}
			if (password.length < 8) {
				return res.status(400).json({ error: 'Password must be at least 8 characters long' })
			}
		}

		// Validate expiration type
		const validExpirationTypes = ['1_hour', '24_hours', '7_days', '30_days']
		if (!validExpirationTypes.includes(expiresIn)) {
			return res.status(400).json({ error: 'Invalid expiration type' })
		}

		// Validate maxViews
		if (maxViews !== null && (typeof maxViews !== 'number' || maxViews < 1)) {
			return res.status(400).json({ error: 'maxViews must be null (unlimited) or a positive number' })
		}

		// Prepare sten data
		const stenData = {
			title: title ? title.trim() : null,
			isPasswordProtected,
			expiresIn,
			maxViews,
		}

		if (isPasswordProtected) {
			console.log('🔐 [CREATE STEN] Creating password-protected sten')
			
			// Encrypt message with password
			const encryptedMessage = Encryption.encryptMessageWithPassword(message, password)
			const passwordHash = hashPasswordOnly(password)
			
			stenData.encryptedMessage = JSON.stringify(encryptedMessage)
			stenData.iv = encryptedMessage.iv
			stenData.passwordHash = JSON.stringify(passwordHash)
			stenData.passwordSalt = passwordHash.salt
			stenData.passwordStrength = Crypto.assessPasswordStrength(password).strength
			stenData.securityLevel = 'medium'
		} else {
			console.log('📄 [CREATE STEN] Creating unprotected sten')
			stenData.content = message
			stenData.securityLevel = 'low'
			stenData.passwordStrength = 'none'
		}

		// Save sten to database
		const sten = new Sten(stenData)
		const savedSten = await sten.save()
		
		console.log('✅ [CREATE STEN] Sten saved successfully:', savedSten._id)

		// Generate public URL
		const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
		const publicUrl = `${baseUrl}/#/solve/${savedSten._id}`

		// Return response with single link and optional password
		const response = {
			link: publicUrl,
		}

		// Include plain password only if sten is password-protected
		if (isPasswordProtected) {
			response.password = password
		}

		res.status(201).json(response)
		
	} catch (error) {
		console.error('❌ [CREATE STEN] Error:', error.message)
		res.status(500).json({ 
			error: 'Failed to create sten',
			details: process.env.NODE_ENV !== 'production' ? error.message : undefined
		})
	}
}

/**
 * View/Access a Sten
 * Handles both password-protected and unprotected stens
 */
export const viewSten = async (req, res) => {
	try {
		const { id } = req.params
		const { password } = req.body

		console.log('🔍 [VIEW STEN] Attempting to view sten:', id)

		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ error: 'Sten not found', code: 'STEN_NOT_FOUND' })
		}

		// Check expiration
		if (sten.expiresAt < new Date()) {
			await Sten.findByIdAndDelete(id) // Clean up expired sten
			return res.status(410).json({ error: 'Sten has expired', code: 'STEN_EXPIRED' })
		}

		// Check view limits
		if (sten.maxViews && sten.currentViews >= sten.maxViews) {
			return res.status(403).json({ error: 'Maximum views reached', code: 'VIEWS_LIMIT_REACHED' })
		}

		// Handle password-protected stens
		if (sten.isPasswordProtected) {
			if (!password || typeof password !== 'string') {
				return res.status(400).json({ error: 'Password required', code: 'PASSWORD_REQUIRED' })
			}

			// Check rate limiting for password attempts
			const clientIP = req.ip || req.connection.remoteAddress
			const attemptKey = `${id}:${clientIP}`
			const now = Date.now()
			
			// Clean old attempts
			if (attemptCounts.has(attemptKey)) {
				const attempts = attemptCounts.get(attemptKey)
				const validAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW)
				attemptCounts.set(attemptKey, validAttempts)
				
				if (validAttempts.length >= MAX_ATTEMPTS) {
					return res.status(429).json({ error: 'Too many password attempts. Try again later.', code: 'RATE_LIMITED' })
				}
			}

			try {
				const passwordHashObj = JSON.parse(sten.passwordHash)
				const isPasswordValid = Crypto.verifyPasswordOnly(password, passwordHashObj)
				
				if (!isPasswordValid) {
					// Record failed attempt
					const attempts = attemptCounts.get(attemptKey) || []
					attempts.push(now)
					attemptCounts.set(attemptKey, attempts)
					
					return res.status(401).json({ error: 'Invalid password', code: 'INVALID_PASSWORD' })
				}

				// Decrypt message
				const encryptedDataObj = JSON.parse(sten.encryptedMessage)
				const content = Crypto.decryptMessageWithPassword(encryptedDataObj, password)
				
				// Clear rate limit on successful attempt
				attemptCounts.delete(attemptKey)
				
				// Increment view count
				await Sten.findByIdAndUpdate(id, { $inc: { currentViews: 1 } })
				
				return res.status(200).json({ content })
				
			} catch (decryptError) {
				return res.status(401).json({ error: 'Invalid password', code: 'INVALID_PASSWORD' })
			}
		} else {
			// Handle unprotected stens
			await Sten.findByIdAndUpdate(id, { $inc: { currentViews: 1 } })
			return res.status(200).json({ content: sten.content })
		}

	} catch (error) {
		console.error('❌ [VIEW STEN] Error:', error.message)
		res.status(500).json({ error: 'Failed to retrieve sten', code: 'INTERNAL_ERROR' })
	}
}

/**
 * Get Sten metadata (for checking status without accessing content)
 */
export const getStenMetadata = async (req, res) => {
	try {
		const { id } = req.params
		
		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ exists: false, code: 'STEN_NOT_FOUND' })
		}

		const now = new Date()
		const expired = sten.expiresAt < now
		const viewsRemaining = sten.maxViews ? Math.max(0, sten.maxViews - sten.currentViews) : 'unlimited'
		
		res.status(200).json({
			exists: true,
			expired,
			isPasswordProtected: sten.isPasswordProtected,
			viewsRemaining,
			maxViews: sten.maxViews,
			currentViews: sten.currentViews,
			expiresAt: sten.expiresAt,
			createdAt: sten.createdAt,
			title: sten.title
		})
		
	} catch (error) {
		console.error('Get sten metadata error:', error.message)
		res.status(500).json({ error: 'Failed to fetch sten metadata', code: 'INTERNAL_ERROR' })
	}
}

// Legacy endpoints (keeping for backward compatibility but simplified)
export const getById = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

		const response = {
			_id: sten._id,
			title: sten.title,
			maxViews: sten.maxViews,
			currentViews: sten.currentViews,
			expiresAt: sten.expiresAt,
			createdAt: sten.createdAt,
			isPasswordProtected: sten.isPasswordProtected,
		}

		res.json(response)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

export const create = async (req, res) => {
	return createSten(req, res)
}

export const solve = async (req, res) => {
	// Legacy endpoint - redirect to viewSten
	return viewSten(req, res)
}

export const update = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

		if (req.body.encryptedMessage != null)
			sten.encryptedMessage = req.body.encryptedMessage
		if (req.body.iv != null) sten.iv = req.body.iv
		if (req.body.passwordHash != null) sten.passwordHash = req.body.passwordHash
		if (req.body.passwordSalt != null) sten.passwordSalt = req.body.passwordSalt
		if (req.body.expiresAt != null) sten.expiresAt = req.body.expiresAt
		if (req.body.maxViews != null) sten.maxViews = req.body.maxViews
		if (req.body.title != null) sten.title = req.body.title

		const updatedSten = await sten.save()
		res.json(updatedSten)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
}

export const remove = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

		await sten.remove()
		res.json({ message: 'Sten deleted' })
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}
