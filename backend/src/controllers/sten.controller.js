import Sten from '../models/Sten.js'
import Encryption from '../utils/crypto/encryption.js'
import Crypto, { hashPasswordOnly } from '../utils/crypto/index.js'

export const getAll = async (req, res) => {
	try {
		const stens = await Sten.find()

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

/**
 * NEW: Metadata-only endpoint for STEN viewing page
 * Returns STEN status without revealing content
 */
export const getStenMetadata = async (req, res) => {
	try {
		const { id } = req.params

		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({
				exists: false,
				reason: 'not_found',
			})
		}

		// Check time-based expiration (only if expiresAt is set)
		if (sten.expiresAt && sten.expiresAt < new Date()) {
			return res.status(410).json({
				exists: true,
				expired: true,
				reason: 'expired',
			})
		}

		if (sten.solved) {
			const remainingViews = sten.maxWinners
				? sten.maxWinners - sten.currentWinners
				: 'unlimited'
			return res.status(200).json({
				exists: true,
				expired: false,
				passwordProtected: sten.isPasswordProtected,
				requiresPassword: sten.isPasswordProtected,
				remainingViews,
				maxWinners: sten.maxWinners,
				currentWinners: sten.currentWinners,
				oneTime: sten.oneTime,
				status: 'solved',
				reason: 'already_solved',
			})
		}

		// Check if winners limit is reached (only if maxWinners is set)
		if (sten.maxWinners && sten.currentWinners >= sten.maxWinners) {
			return res.status(200).json({
				exists: true,
				expired: false,
				passwordProtected: sten.isPasswordProtected,
				requiresPassword: sten.isPasswordProtected,
				remainingViews: 0,
				maxWinners: sten.maxWinners,
				currentWinners: sten.currentWinners,
				oneTime: sten.oneTime,
				status: 'winners_reached',
			})
		}

		const remainingViews = sten.maxWinners
			? sten.maxWinners - sten.currentWinners
			: 'unlimited'
		res.status(200).json({
			exists: true,
			expired: false,
			passwordProtected: sten.isPasswordProtected,
			requiresPassword: sten.isPasswordProtected,
			remainingViews,
			maxWinners: sten.maxWinners,
			currentWinners: sten.currentWinners,
			oneTime: sten.oneTime,
			status: 'active',
			createdAt: sten.createdAt,
		})
	} catch (error) {
		console.error('Get STEN metadata error:', error.message)
		res.status(500).json({ error: 'Failed to fetch STEN metadata' })
	}
}

/**
 * NEW: Password unlock endpoint for protected STENs
 */
export const unlockSten = async (req, res) => {
	try {
		const { id } = req.params
		const { password } = req.body

		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ success: false, code: 'STEN_NOT_FOUND' })
		}

		// Check time-based expiration (only if expiresAt is set)
		if (sten.expiresAt && sten.expiresAt < new Date()) {
			return res.status(410).json({ success: false, code: 'STEN_EXPIRED' })
		}

		if (sten.solved) {
			return res.status(403).json({ success: false, code: 'STEN_ALREADY_VIEWED' })
		}

		// Check winner limits (allow unlimited winners)
		if (sten.maxWinners && sten.currentWinners >= sten.maxWinners) {
			return res.status(403).json({ success: false, code: 'WINNERS_LIMIT_REACHED' })
		}

		if (!password || typeof password !== 'string') {
			return res.status(400).json({ success: false, code: 'PASSWORD_REQUIRED' })
		}

		try {
			const passwordHashObj = JSON.parse(sten.passwordHash)
			const isPasswordValid = Crypto.verifyPasswordOnly(
				password,
				passwordHashObj
			)

			if (!isPasswordValid) {
				return res.status(401).json({ success: false, code: 'INVALID_PASSWORD' })
			}

			const encryptedDataObj = JSON.parse(sten.encryptedMessage)
			const content = Crypto.decryptMessageWithPassword(
				encryptedDataObj,
				password
			)

			let shouldExpire = false

			if (sten.oneTime) {
				shouldExpire = true
			}

			const updatedSten = await Sten.findByIdAndUpdate(
				id,
				{
					$inc: { currentWinners: 1 },
					...(sten.currentWinners + 1 >= sten.maxWinners || shouldExpire
						? { solved: true }
						: {}),
				},
				{ new: true }
			)

			if (shouldExpire) {
				await Sten.findByIdAndDelete(id)
			}

			res.status(200).json({
				content,
				consumed: shouldExpire,
				currentWinners: updatedSten?.currentWinners || sten.currentWinners + 1,
				solved: shouldExpire || updatedSten?.solved || false,
			})
		} catch (decryptError) {
			return res.status(401).json({ error: 'Incorrect password' })
		}
	} catch (error) {
		console.error('Unlock STEN error:', error.message)
		res.status(500).json({ error: 'Failed to unlock STEN' })
	}
}

/**
 * NEW: View endpoint for unprotected STENs
 */
export const viewSten = async (req, res) => {
	try {
		const { id } = req.params

		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ success: false, code: 'STEN_NOT_FOUND' })
		}

		// Check time-based expiration (only if expiresAt is set)
		if (sten.expiresAt && sten.expiresAt < new Date()) {
			return res.status(410).json({ success: false, code: 'STEN_EXPIRED' })
		}

		if (sten.solved) {
			return res.status(403).json({ success: false, code: 'STEN_ALREADY_VIEWED' })
		}

		// Check winner limits (allow unlimited winners)
		if (sten.maxWinners && sten.currentWinners >= sten.maxWinners) {
			return res.status(403).json({ success: false, code: 'WINNERS_LIMIT_REACHED' })
		}

		if (!sten.isPasswordProtected) {
			let shouldExpire = false

			if (sten.oneTime) {
				shouldExpire = true
			}

			const updatedSten = await Sten.findByIdAndUpdate(
				id,
				{
					$inc: { currentWinners: 1 },
					...(sten.currentWinners + 1 >= sten.maxWinners || shouldExpire
						? { solved: true }
						: {}),
				},
				{ new: true }
			)

			if (shouldExpire) {
				await Sten.findByIdAndDelete(id)
			}

			res.status(200).json({
				content: sten.content,
				consumed: shouldExpire,
				currentWinners: updatedSten?.currentWinners || sten.currentWinners + 1,
				solved: shouldExpire || updatedSten?.solved || false,
			})
		} else {
			return res.status(400).json({ success: false, code: 'PASSWORD_REQUIRED' })
		}
	} catch (error) {
		console.error('View STEN error:', error.message)
		res.status(500).json({ error: 'Failed to retrieve STEN content' })
	}
}

export const createSten = async (req, res) => {
	try {
		const {
			message,
			isPasswordProtected,
			password,
			expiresIn: requestExpiresIn,
			maxWinners = 1,
			oneTime = false,
		} = req.body

		if (!message || typeof message !== 'string') {
			return res
				.status(400)
				.json({ error: 'Message is required and must be a string' })
		}

		if (typeof isPasswordProtected !== 'boolean') {
			return res
				.status(400)
				.json({ error: 'isPasswordProtected must be a boolean' })
		}

		if (isPasswordProtected) {
			if (!password || typeof password !== 'string') {
				return res
					.status(400)
					.json({ error: 'Password is required when protection is enabled' })
			}

			if (password.length < 8) {
				return res
					.status(400)
					.json({ error: 'Password must be at least 8 characters long' })
			}
		} else {
			if (password && typeof password === 'string' && password.trim() !== '') {
				return res.status(400).json({
					error: 'Password should not be provided when protection is disabled',
				})
			}
		}

		// Handle expiration based on expiresIn type
		const now = new Date()
		let expiresAt = null
		let expiresIn = req.body.expiresIn || '24_hours'

		switch (expiresIn) {
			case 'after_viewing':
				// No time-based expiration
				expiresAt = null
				break
			case '1_hour':
				expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
				break
			case '24_hours':
				expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
				break
			case '7_days':
				expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
				break
			case '30_days':
				expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
				break
			default:
				return res.status(400).json({ error: 'Invalid expiration type' })
		}

		// Special handling for one-time STENs
		if (oneTime) {
			expiresIn = 'after_viewing'
			expiresAt = null
		}

		if (maxWinners !== null && (typeof maxWinners !== 'number' || maxWinners < 1)) {
			return res
				.status(400)
				.json({ error: 'Max winners must be null (unlimited) or a positive number' })
		}

		if (oneTime && maxWinners !== null && maxWinners > 1) {
			return res
				.status(400)
				.json({ error: 'One-time STENs can only have 1 winner' })
		}

		const stenData = {
			isPasswordProtected,
			expiresAt,
			expiresIn,
			maxWinners,
			oneTime,
		}

		if (isPasswordProtected) {
			// Use password-based encryption to match the unlock method
			const encryptedMessage = Encryption.encryptMessageWithPassword(
				message,
				password
			)
			const passwordHash = hashPasswordOnly(password)

			stenData.encryptedMessage = JSON.stringify(encryptedMessage)
			stenData.iv = encryptedMessage.iv
			stenData.passwordHash = JSON.stringify(passwordHash)
			stenData.passwordSalt = passwordHash.salt
			stenData.passwordStrength =
				Crypto.assessPasswordStrength(password).strength
			stenData.securityLevel = 'medium'
		} else {
			// For unprotected STENs, store as plain text
			stenData.content = message
			stenData.securityLevel = 'low'
			stenData.passwordStrength = 'none'
		}

		const sten = new Sten(stenData)
		const savedSten = await sten.save()

		const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
		const publicUrl = `${baseUrl}/solve/${savedSten._id}`

		res.status(201).json({
			stenId: savedSten._id,
			publicUrl: publicUrl,
		})
	} catch (error) {
		console.error('STEN creation error:', error.message)
		res.status(500).json({ error: 'Failed to create STEN' })
	}
}

export const solve = async (req, res) => {
	try {
		const { id } = req.params
		const { password } = req.body

		const sten = await Sten.findById(id)
		if (!sten) {
			return res.status(404).json({ error: 'Sten not found' })
		}

		// Check time-based expiration (only if expiresAt is set)
		if (sten.expiresAt && sten.expiresAt < new Date()) {
			return res.status(410).json({ error: 'Sten has expired' })
		}

		if (sten.solved) {
			return res.status(403).json({ error: 'Sten already solved' })
		}

		// Check winner limits (allow unlimited winners)
		if (sten.maxWinners && sten.currentWinners >= sten.maxWinners) {
			return res.status(403).json({ error: 'Maximum winners reached' })
		}

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

		// Build update query - only check winner limit if maxWinners is set
		const updateQuery = {
			_id: id,
			solved: false,
		}

		// Only add currentWinners check if maxWinners is not null (unlimited)
		if (sten.maxWinners) {
			updateQuery.currentWinners = { $lt: sten.maxWinners }
		}

		const updatedSten = await Sten.findOneAndUpdate(
			updateQuery,
			{
				$inc: { currentWinners: 1 },
			},
			{
				new: true,
				runValidators: true,
			}
		)

		if (!updatedSten) {
			return res.status(403).json({ error: 'Maximum winners reached' })
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

export const getById = async (req, res) => {
	try {
		const sten = await Sten.findById(req.params.id)
		if (!sten) return res.status(404).json({ message: 'Sten not found' })

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

export const create = async (req, res) => {
	return createSten(req, res)
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
