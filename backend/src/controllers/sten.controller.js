import Sten from '../models/Sten.js'
import Encryption from '../utils/crypto/encryption.js'
import Crypto, { hashPasswordOnly } from '../utils/crypto/index.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import QRCode from 'qrcode'

// Rate limiting map for brute-force protection
const attemptCounts = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

// Configure multer storage with custom filename generation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = 'uploads'
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(4).toString('hex')
    const ext = path.extname(file.originalname)
    const basename = path.basename(file.originalname, ext)
    const safeBasename = basename.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20)
    cb(null, `${file.fieldname}-${timestamp}-${randomString}-${safeBasename}${ext}`)
  }
})

// File filter for logo (images only)
const logoFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Logo must be JPEG, JPG, PNG, or WEBP'), false)
  }

  if (file.size > maxSize) {
    return cb(new Error('File too large. Logo must be less than 5MB'), false)
  }

  cb(null, true)
}

// File filter for attachment (pdf, images, documents)
const attachmentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Attachment must be PDF, image, Word doc, or text file'), false)
  }

  if (file.size > maxSize) {
    return cb(new Error('File too large. Attachment must be less than 10MB'), false)
  }

  cb(null, true)
}

// Configure multer with proper storage and file filters
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'logo') {
      logoFileFilter(req, file, cb)
    } else if (file.fieldname === 'attachment') {
      attachmentFileFilter(req, file, cb)
    } else {
      cb(new Error('Invalid field name'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB overall limit
  }
})

// Helper function to handle both JSON and form-data
const parseStenData = (req) => {
  // Check if request has files (multipart/form-data)
  if (req.files) {
    const parsedData = {
      ...req.body,
      logo: req.files.logo ? req.files.logo[0] : null,
      attachment: req.files.attachment ? req.files.attachment[0] : null
    }

    // Handle string 'null' values for maxViews field
    if (parsedData.maxViews === 'null') {
      parsedData.maxViews = null
    } else if (typeof parsedData.maxViews === 'string') {
      parsedData.maxViews = parseInt(parsedData.maxViews, 10)
    }

    // Handle boolean conversion for isPasswordProtected
    if (parsedData.isPasswordProtected === 'true') {
      parsedData.isPasswordProtected = true
    } else if (parsedData.isPasswordProtected === 'false') {
      parsedData.isPasswordProtected = false
    }

    return parsedData
  }
  // Otherwise, it's JSON data
  return req.body
}

/**
 * Get all stens (admin endpoint)
 */
export const getAll = async (req, res) => {
	try {
		const stens = await Sten.find()

		const response = stens.map(sten => ({
			_id: sten._id,
			title: sten.title,
			description: sten.description || null,
			prize: sten.prize || null,
			logoUrl: sten.logoUrl || null,
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
		// Parse data from either JSON or form-data
		const parsedData = parseStenData(req)
		let logoFile = parsedData.logo
		let documentFile = parsedData.document

		// Handle form-data fields
		const {
			title,
			description,
			message,
			prize,
			logoUrl,
			isPasswordProtected,
			password,
			expiresIn = '24_hours',
			maxViews = 1,
		} = parsedData

		// Get the attachment file (new field name)
		let attachmentFile = parsedData.attachment

		// Validate required fields
		if (
			!message ||
			typeof message !== 'string' ||
			message.trim().length === 0
		) {
			return res.status(400).json({ error: 'Message is required' })
		}

		// Validate password protection
		if (typeof isPasswordProtected !== 'boolean') {
			return res
				.status(400)
				.json({ error: 'isPasswordProtected must be a boolean' })
		}

		// Validate password if protected
		if (isPasswordProtected) {
			if (!password || typeof password !== 'string') {
				return res
					.status(400)
					.json({ error: 'Password is required for password-protected stens' })
			}
			if (password.length < 8) {
				return res
					.status(400)
					.json({ error: 'Password must be at least 8 characters long' })
			}
		}

		// Validate expiration type
		const validExpirationTypes = ['1_hour', '24_hours', '7_days', '30_days']
		if (!validExpirationTypes.includes(expiresIn)) {
			return res.status(400).json({ error: 'Invalid expiration type' })
		}

		// Validate maxViews
		if (maxViews !== null && (typeof maxViews !== 'number' || maxViews < 1)) {
			return res.status(400).json({
				error: 'maxViews must be null (unlimited) or a positive number',
			})
		}

		// Prepare sten data
		const charCount = typeof message === 'string' ? message.length : 0
		const stenData = {
			title: title ? title.trim() : null,
			description: description ? description.trim() : null,
			logoUrl: logoUrl || null,
			prize: prize ? String(prize).trim() : null,
			charCount,
			isPasswordProtected,
			expiresIn,
			maxViews,
		}

		// Handle file uploads - store files locally in /uploads directory
		if (logoFile) {
			// Store logo file path
			stenData.logoUrl = `/uploads/${logoFile.filename}`
		}

		if (attachmentFile) {
			// Store attachment information with new field names
			stenData.attachmentName = attachmentFile.originalname
			stenData.attachmentType = attachmentFile.mimetype
			stenData.attachmentUrl = `/uploads/${attachmentFile.filename}`
		}

		if (isPasswordProtected) {
			console.log('🔐 [CREATE STEN] Creating password-protected sten')

			// Encrypt message with password
			const encryptedMessage = Encryption.encryptMessageWithPassword(
				message,
				password
			)
			const passwordHash = hashPasswordOnly(password)

			// Store the encrypted message data
			stenData.encryptedMessage = JSON.stringify({
				encryptedData: encryptedMessage.encryptedData,
				iv: encryptedMessage.iv,
				salt: encryptedMessage.salt,
				algorithm: encryptedMessage.algorithm
			})
			stenData.iv = encryptedMessage.iv
			stenData.passwordHash = JSON.stringify(passwordHash)
			stenData.passwordSalt = passwordHash.salt
			stenData.passwordStrength =
				Crypto.assessPasswordStrength(password).strength
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

		// Generate QR code for easy access and sharing
		try {
			const qrCodeData = await QRCode.toDataURL(publicUrl, {
				errorCorrectionLevel: 'H',
				width: 300,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				}
			})

			// Save QR code to database
			savedSten.qrCode = qrCodeData
			await savedSten.save()
			console.log('📱 [CREATE STEN] QR code generated successfully')
		} catch (qrError) {
			console.error('⚠️ [CREATE STEN] QR code generation failed:', qrError.message)
			// Continue without QR code if generation fails
		}

		// Construct full URLs for files
		const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`

		// Return response with single link, optional password, and all file data
		const response = {
			link: publicUrl,
			qrCode: savedSten.qrCode || null,
			logoUrl: savedSten.logoUrl ? `${backendUrl}${savedSten.logoUrl}` : null,
			attachmentUrl: savedSten.attachmentUrl ? `${backendUrl}${savedSten.attachmentUrl}` : null,
			attachmentName: savedSten.attachmentName || null,
			attachmentType: savedSten.attachmentType || null,
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
			details:
				process.env.NODE_ENV !== 'production' ? error.message : undefined,
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
			return res
				.status(404)
				.json({ error: 'Sten not found', code: 'STEN_NOT_FOUND' })
		}

		// Check expiration
		if (sten.expiresAt < new Date()) {
			await Sten.findByIdAndDelete(id) // Clean up expired sten
			return res
				.status(410)
				.json({ error: 'Sten has expired', code: 'STEN_EXPIRED' })
		}

		// Check view limits
		if (sten.maxViews && sten.currentViews >= sten.maxViews) {
			return res
				.status(403)
				.json({ error: 'Maximum views reached', code: 'VIEWS_LIMIT_REACHED' })
		}

		// Handle password-protected stens
		if (sten.isPasswordProtected) {
			if (!password || typeof password !== 'string') {
				return res
					.status(400)
					.json({ error: 'Password required', code: 'PASSWORD_REQUIRED' })
			}

			// Check rate limiting for password attempts
			const clientIP = req.ip || req.connection.remoteAddress
			const attemptKey = `${id}:${clientIP}`
			const now = Date.now()

			// Clean old attempts
			if (attemptCounts.has(attemptKey)) {
				const attempts = attemptCounts.get(attemptKey)
				const validAttempts = attempts.filter(
					timestamp => now - timestamp < RATE_LIMIT_WINDOW
				)
				attemptCounts.set(attemptKey, validAttempts)

				if (validAttempts.length >= MAX_ATTEMPTS) {
					return res.status(429).json({
						error: 'Too many password attempts. Try again later.',
						code: 'RATE_LIMITED',
					})
				}
			}

			try {
				const passwordHashObj = JSON.parse(sten.passwordHash)
				const isPasswordValid = Crypto.verifyPasswordOnly(
					password,
					passwordHashObj
				)

				if (!isPasswordValid) {
					// Record failed attempt
					const attempts = attemptCounts.get(attemptKey) || []
					attempts.push(now)
					attemptCounts.set(attemptKey, attempts)

					return res
						.status(401)
						.json({ error: 'Invalid password', code: 'INVALID_PASSWORD' })
				}

				// Decrypt message
				const encryptedDataObj = JSON.parse(sten.encryptedMessage)
				const content = Crypto.decryptMessageWithPassword(
					encryptedDataObj,
					password
				)

				// Clear rate limit on successful attempt
				attemptCounts.delete(attemptKey)

				// Increment view count
				await Sten.findByIdAndUpdate(id, { $inc: { currentViews: 1 } })

				// Construct full URLs for files
				const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`

				return res.status(200).json({
					content,
					logoUrl: sten.logoUrl ? `${backendUrl}${sten.logoUrl}` : null,
					description: sten.description || null,
					prize: sten.prize || null,
					charCount: sten.charCount || 0,
				})
			} catch (decryptError) {
				return res
					.status(401)
					.json({ error: 'Invalid password', code: 'INVALID_PASSWORD' })
			}
		} else {
			// Handle unprotected stens
			await Sten.findByIdAndUpdate(id, { $inc: { currentViews: 1 } })

			// Construct full URLs for files
			const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`

			return res.status(200).json({
				content: sten.content,
				logoUrl: sten.logoUrl ? `${backendUrl}${sten.logoUrl}` : null,
				description: sten.description || null,
				prize: sten.prize || null,
				charCount: sten.charCount || 0,
			})
		}
	} catch (error) {
		console.error('❌ [VIEW STEN] Error:', error.message)
		res
			.status(500)
			.json({ error: 'Failed to retrieve sten', code: 'INTERNAL_ERROR' })
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
		const viewsRemaining = sten.maxViews
			? Math.max(0, sten.maxViews - sten.currentViews)
			: 'unlimited'

		// Construct full URLs for files
		const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`

		res.status(200).json({
			exists: true,
			expired,
			isPasswordProtected: sten.isPasswordProtected,
			logoUrl: sten.logoUrl ? `${backendUrl}${sten.logoUrl}` : null,
			description: sten.description || null,
			prize: sten.prize || null,
			charCount: sten.charCount || 0,
			viewsRemaining,
			maxViews: sten.maxViews,
			currentViews: sten.currentViews,
			expiresAt: sten.expiresAt,
			createdAt: sten.createdAt,
			title: sten.title,
			qrCode: sten.qrCode || null,
		})
	} catch (error) {
		console.error('Get sten metadata error:', error.message)
		res
			.status(500)
			.json({ error: 'Failed to fetch sten metadata', code: 'INTERNAL_ERROR' })
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
			description: sten.description || null,
			logoUrl: sten.logoUrl || null,
			prize: sten.prize || null,
			charCount: sten.charCount || 0,
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

// Export multer upload middleware for use in routes
export { upload }

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


// In sten.controller.js
export const getSten = async (req, res) => {
  try {
    const sten = await Sten.findById(req.params.id);
    if (!sten) {
      return res.status(404).json({ message: 'STEN not found' });
    }

    // Make sure to include all necessary fields in the response
    const response = {
      id: sten._id,
      title: sten.title,
      message: sten.message,
      logo: sten.logo,  // Make sure this line exists
      // ... include other fields you need
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
