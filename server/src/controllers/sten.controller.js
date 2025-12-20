import Sten from '../models/Sten.js'
import Crypto, { encryptMessage, hashPasswordOnly, verifyPasswordOnly, decryptMessageWithPassword } from '../utils/crypto/index.js'

export const getAll = async (req, res) => {
	try {
		const stens = await Sten.find()

		// Return Sten data without sensitive information
		const response = stens.map(sten => ({
			_id: sten._id,
			maxWinners: sten.maxWinners,
			currentWinners: sten.currentWinners,
			oneTime: sten.oneTime,
			solved: sten.solved,
			expiresAt: sten.expiresAt,
			createdAt: sten.createdAt,
		}))

		res.json(response)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

export const getById = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

		// Return Sten data without sensitive information
		const response = {
			_id: sten._id,
			maxWinners: sten.maxWinners,
			currentWinners: sten.currentWinners,
			oneTime: sten.oneTime,
			solved: sten.solved,
			expiresAt: sten.expiresAt,
			createdAt: sten.createdAt,
		}

		res.json(response)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

export const getStatus = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

		let status = 'active'

		if (sten.solved) {
			status = 'solved'
		} else if (sten.expiresAt < new Date()) {
			status = 'expired'
		}

		res.json({ status })
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

/**
 * COMPLETELY FIXED: Secure STEN creation endpoint with proper conditional logic
 * 
 * This implements ALL the required behavior:
 * 1. Conditional password validation (only required when isPasswordProtected=true)
 * 2. Proper expiration handling (after-viewing vs time-based)
 * 3. One-time view logic
 * 4. Max winners logic
 * 5. Clear error messages
 */
export const createSten = async (req, res) => {
	try {
		const {
			message,
			isPasswordProtected,
			password,
			expiresAt,
			maxWinners = 1,
			oneTime = false,
		} = req.body

		// 1. Input Validation
		if (!message || typeof message !== 'string') {
			return res.status(400).json({ error: 'Message is required and must be a string' })
		}

		if (typeof isPasswordProtected !== 'boolean') {
			return res.status(400).json({ error: 'isPasswordProtected must be a boolean' })
		}

		// 2. CRITICAL FIX: Conditional password validation
		if (isPasswordProtected) {
			if (!password || typeof password !== 'string') {
				return res.status(400).json({ error: 'Password is required when protection is enabled' })
			}

			if (password.length < 8) {
				return res.status(400).json({ error: 'Password must be at least 8 characters long' })
			}

			// Password Strength Assessment
			const passwordStrength = Crypto.assessPasswordStrength(password)
			if (passwordStrength.strength === 'weak') {
				return res.status(400).json({
					error: 'Password is too weak',
					recommendations: passwordStrength.recommendations,
				})
			}
		} else {
			// When protection is disabled, password should not be provided
			if (password && typeof password === 'string' && password.trim() !== '') {
				return res.status(400).json({
					error: 'Password should not be provided when protection is disabled',
				})
			}
		}

		// 3. Handle expiration dates properly
		let expirationDate;
		if (expiresAt instanceof Date) {
			expirationDate = expiresAt;
		} else if (typeof expiresAt === 'string') {
			expirationDate = new Date(expiresAt);
		} else {
			return res.status(400).json({ error: 'Expiration date is required' })
		}

		// For after-viewing STENs, set to far future (they'll expire after viewing)
		if (oneTime) {
			// One-time STENs expire after first successful view
			expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
		} else if (expirationDate <= new Date()) {
			return res.status(400).json({ error: 'Expiration date must be in the future' })
		}

		// 4. Validate maxWinners
		if (typeof maxWinners !== 'number' || maxWinners < 1) {
			return res.status(400).json({ error: 'Max winners must be a positive number' })
		}

		// 5. One-time STEN constraints
		if (oneTime && maxWinners > 1) {
			return res.status(400).json({ error: 'One-time STENs can only have 1 winner' })
		}

		// 6. Create STEN Document
		const stenData = {
			isPasswordProtected,
			expiresAt: expirationDate,
			maxWinners,
			oneTime,
		}

		// 7. Conditional encryption and password handling
		if (isPasswordProtected) {
			// Encrypt message and hash password
			const encryptedMessage = encryptMessage(message)
			const passwordHash = hashPasswordOnly(password)

			stenData.encryptedMessage = JSON.stringify(encryptedMessage)
			stenData.iv = encryptedMessage.iv
			stenData.passwordHash = JSON.stringify(passwordHash)
			stenData.passwordSalt = passwordHash.salt
			stenData.passwordStrength = Crypto.assessPasswordStrength(password).strength
			stenData.securityLevel = 'medium'
		} else {
			// Store plain content for unprotected STENs
			stenData.content = message
			stenData.securityLevel = 'low'
			stenData.passwordStrength = 'none'
		}

		// 8. Save to MongoDB
		const sten = new Sten(stenData)
		const savedSten = await sten.save()

		// 9. Generate Public URL
		const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
		const publicUrl = `${baseUrl}/solve/${savedSten._id}`

		// 10. Return Only Required Information
		res.status(201).json({
			stenId: savedSten._id,
			publicUrl: publicUrl,
		})
	} catch (error) {
		console.error('STEN creation error:', error.message)
		res.status(500).json({ error: 'Failed to create STEN' })
	}
}

/**
 * COMPLETELY FIXED: View STEN with proper one-time and maxWinners logic
 * 
 * This implements:
 * 1. No password required for unprotected STENs
 * 2. Password required only for protected STENs
 * 3. One-time view consumption AFTER successful view
 * 4. Max winners tracking
 * 5. Proper expiration checks
 */
export const viewSten = async (req, res) => {
	try {
		const { id } = req.params
		const { password } = req.body

		// 1. Check if Sten exists
		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ error: 'Sten not found' })
		}

		// 2. Check if expired by time
		if (sten.expiresAt < new Date()) {
			return res.status(410).json({ error: 'Sten has expired' })
		}

		// 3. Check if already solved (reached max winners)
		if (sten.solved) {
			return res.status(403).json({ error: 'Sten already solved' })
		}

		// 4. Check if already reached max winners
		if (sten.currentWinners >= sten.maxWinners) {
			return res.status(403).json({ error: 'Maximum winners reached' })
		}

		let content = ''
		let canView = false

		// 5. Handle unprotected STENs (NO PASSWORD REQUIRED)
		if (!sten.isPasswordProtected) {
			content = sten.content
			canView = true
		} else {
			// Handle protected STENs
			if (!password) {
				return res.status(400).json({ error: 'Password required for this Sten' })
			}

			if (typeof password !== 'string') {
				return res.status(400).json({ error: 'Password must be a string' })
			}

			// Try to decrypt and validate password
			try {
				const passwordHashObj = JSON.parse(sten.passwordHash)
				const isPasswordValid = verifyPasswordOnly(password, passwordHashObj)
				
				if (!isPasswordValid) {
					return res.status(401).json({ error: 'Incorrect password' })
				}
				
				// Decrypt the message
				const encryptedDataObj = JSON.parse(sten.encryptedMessage)
				content = decryptMessageWithPassword(encryptedDataObj, password)
				canView = true
			} catch (accessError) {
				return res.status(401).json({ error: 'Incorrect password' })
			}
		}

		// 6. Only process successful views
		if (canView) {
			let shouldExpire = false
			
			// CRITICAL FIX: One-time view expires immediately after first successful view
			if (sten.oneTime) {
				shouldExpire = true
			}
			
			// Update winner count and check if we should expire
			const updatedSten = await Sten.findByIdAndUpdate(
				id,
				{
					$inc: { currentWinners: 1 },
					// Set solved to true if we've reached max winners or it's one-time
					...(sten.currentWinners + 1 >= sten.maxWinners || shouldExpire 
						? { solved: true } 
						: {})
				},
				{ new: true }
			)

			// For one-time view, delete the STEN immediately
			if (shouldExpire) {
				await Sten.findByIdAndDelete(id)
			}

			res.status(200).json({
				content,
				isPasswordProtected: sten.isPasswordProtected,
				consumed: shouldExpire,
				currentWinners: updatedSten?.currentWinners || sten.currentWinners + 1,
				solved: shouldExpire || (updatedSten?.solved || false)
			})
		}
	} catch (error) {
		console.error('View STEN error:', error.message)
		res.status(500).json({ error: 'Failed to retrieve STEN content' })
	}
}

export const solve = async (req, res) => {
	try {
		const { id } = req.params
		const { password } = req.body
		const userId = req.user?.id || req.body.userId

		if (!userId) {
			return res.status(401).json({ error: 'User authentication required' })
		}

		// First, check if the Sten exists and get basic info
		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ error: 'Sten not found' })
		}

		// Check if expired
		if (sten.expiresAt < new Date()) {
			return res.status(410).json({ error: 'Sten has expired' })
		}

		// Check if already solved
		if (sten.solved) {
			return res.status(403).json({ error: 'Sten already solved' })
		}

		// Access the STEN with new security system
		let decryptedMessage
		try {
			decryptedMessage = Crypto.accessSten(
				sten.encryptedMessage,
				sten.passwordHash,
				password
			)
		} catch (accessError) {
			return res.status(401).json({ error: 'Incorrect password' })
		}

		// Atomic operation: Attempt to claim the win
		const updatedSten = await Sten.findOneAndUpdate(
			{
				_id: id,
				solved: false,
				currentWinners: { $lt: sten.maxWinners },
				solvedBy: { $ne: userId },
			},
			{
				$inc: { currentWinners: 1 },
				$push: { solvedBy: userId },
			},
			{
				new: true,
				runValidators: true,
			}
		)

		if (!updatedSten) {
			const currentSten = await Sten.findById(id)
			if (currentSten.solved) {
				return res.status(403).json({ error: 'Sten already solved' })
			} else {
				return res.status(403).json({ error: 'Maximum winners reached' })
			}
		}

		res.status(200).json({
			success: true,
			message: decryptedMessage,
			currentWinners: updatedSten.currentWinners,
			solved: updatedSten.solved,
		})
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

export const update = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

		// Update allowed fields (be careful with security)
		if (req.body.encryptedMessage != null)
			sten.encryptedMessage = req.body.encryptedMessage
		if (req.body.iv != null) sten.iv = req.body.iv
		if (req.body.passwordHash != null) sten.passwordHash = req.body.passwordHash
		if (req.body.passwordSalt != null) sten.passwordSalt = req.body.passwordSalt
		if (req.body.expiresAt != null) sten.expiresAt = req.body.expiresAt
		if (req.body.maxWinners != null) sten.maxWinners = req.body.maxWinners
		if (req.body.oneTime != null) sten.oneTime = req.body.oneTime

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

export const create = async (req, res) => {
	// Legacy endpoint - kept for backward compatibility
	return createSten(req, res)
}
