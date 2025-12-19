import Sten from '../models/Sten.js';
import Crypto from '../utils/crypto/index.js';

export const getAll = async (req, res) => {
  try {
    const stens = await Sten.find();

    // Return Sten data without sensitive information
    const response = stens.map(sten => ({
      _id: sten._id,
      maxWinners: sten.maxWinners,
      currentWinners: sten.currentWinners,
      oneTime: sten.oneTime,
      solved: sten.solved,
      expiresAt: sten.expiresAt,
      createdAt: sten.createdAt
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const sten = await Sten.findById(req.params.id);
    if (!sten) return res.status(404).json({ message: 'Sten not found' });

    // Return Sten data without sensitive information
    const response = {
      _id: sten._id,
      maxWinners: sten.maxWinners,
      currentWinners: sten.currentWinners,
      oneTime: sten.oneTime,
      solved: sten.solved,
      expiresAt: sten.expiresAt,
      createdAt: sten.createdAt
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStatus = async (req, res) => {
  try {
    const sten = await Sten.findById(req.params.id);
    if (!sten) return res.status(404).json({ message: 'Sten not found' });

    let status = 'active';

    if (sten.solved) {
      status = 'solved';
    } else if (sten.expiresAt < new Date()) {
      status = 'expired';
    }

    res.json({ status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { message, password, expiresAt, maxWinners } = req.body;

    // Validate required fields
    if (!message || !password || !expiresAt || maxWinners === undefined) {
      return res.status(400).json({ error: 'Missing required fields: message, password, expiresAt, maxWinners' });
    }

    // Create STEN with basic security (default)
    const stenData = Crypto.createSten(message, password);

    const sten = new Sten({
      encryptedMessage: stenData.encryptedData,
      iv: JSON.parse(stenData.encryptedData).iv, // Extract IV from encrypted data
      passwordHash: stenData.passwordHash,
      passwordSalt: JSON.parse(stenData.passwordHash).salt, // Extract salt from hash
      expiresAt: new Date(expiresAt),
      maxWinners: maxWinners,
      oneTime: req.body.oneTime || false,
      securityLevel: stenData.securityLevel,
      passwordStrength: stenData.passwordStrength,
    });

    const newSten = await sten.save();

    // Return created STEN without sensitive data
    const response = {
      _id: newSten._id,
      maxWinners: newSten.maxWinners,
      currentWinners: newSten.currentWinners,
      oneTime: newSten.oneTime,
      solved: newSten.solved,
      expiresAt: newSten.expiresAt,
      createdAt: newSten.createdAt,
      securityLevel: newSten.securityLevel,
      passwordStrength: newSten.passwordStrength
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Secure STEN creation endpoint
 * Flow: 1. Receive message + password -> 2. Encrypt message -> 3. Hash password with salt -> 4. Save to MongoDB -> 5. Return stenId + public URL
 * NEVER logs sensitive data
 */
export const createSten = async (req, res) => {
  try {
    const { message, password, expiresAt, maxWinners = 1, oneTime = false } = req.body;

    // 1. Input Validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required and must be a string' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!expiresAt) {
      return res.status(400).json({ error: 'Expiration date is required' });
    }

    const expirationDate = new Date(expiresAt);
    if (expirationDate <= new Date()) {
      return res.status(400).json({ error: 'Expiration date must be in the future' });
    }

    if (typeof maxWinners !== 'number' || maxWinners < 1) {
      return res.status(400).json({ error: 'Max winners must be a positive number' });
    }

    // Validate one-time STEN constraints
    if (oneTime && maxWinners > 1) {
      return res.status(400).json({ error: 'One-time STENs can only have 1 winner' });
    }

    // 2. Password Strength Assessment (without logging sensitive data)
    const passwordStrength = Crypto.assessPasswordStrength(password);
    if (passwordStrength.strength === 'weak') {
      return res.status(400).json({ 
        error: 'Password is too weak',
        recommendations: passwordStrength.recommendations
      });
    }

    // 3. Encrypt Message (crypto utilities handle encryption without logging)
    const encryptedMessage = Crypto.encryptMessage(message);
    
    // 4. Hash Password with Salt
    const passwordHash = Crypto.hashPasswordOnly(password);

    // 5. Create STEN Document
    const sten = new Sten({
      encryptedMessage: JSON.stringify(encryptedMessage),
      iv: encryptedMessage.iv,
      passwordHash: JSON.stringify(passwordHash),
      passwordSalt: passwordHash.salt,
      expiresAt: expirationDate,
      maxWinners: maxWinners,
      oneTime: oneTime,
      passwordStrength: passwordStrength.strength,
      securityLevel: 'medium' // Using password-only hashing
    });

    // 6. Save to MongoDB
    const savedSten = await sten.save();

    // 7. Generate Public URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const publicUrl = `${baseUrl}/solve/${savedSten._id}`;

    // 8. Return Only Required Information
    res.status(201).json({
      stenId: savedSten._id,
      publicUrl: publicUrl
    });

  } catch (error) {
    // Generic error message to prevent information leakage
    console.error('STEN creation error:', error.message); // Log error without sensitive data
    res.status(500).json({ error: 'Failed to create STEN' });
  }
};

export const solve = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = req.user?.id || req.body.userId; // Assume user ID from auth middleware or request body

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // First, check if the Sten exists and get basic info
    const sten = await Sten.findById(id);
    if (!sten) {
      return res.status(404).json({ error: 'Sten not found' });
    }

    // Check if expired
    if (sten.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Sten has expired' });
    }

    // Check if already solved
    if (sten.solved) {
      return res.status(403).json({ error: 'Sten already solved' });
    }

    // Access the STEN with new security system
    let decryptedMessage;
    try {
      decryptedMessage = Crypto.accessSten(sten.encryptedMessage, sten.passwordHash, password);
    } catch (accessError) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Atomic operation: Attempt to claim the win
    const updatedSten = await Sten.findOneAndUpdate(
      {
        _id: id,
        solved: false,
        currentWinners: { $lt: sten.maxWinners }, // Ensure we haven't reached max winners
        solvedBy: { $ne: userId } // Prevent the same user from winning multiple times
      },
      {
        $inc: { currentWinners: 1 },
        $push: { solvedBy: userId }
        // Note: solved will be set to true by pre-save middleware when currentWinners >= maxWinners
      },
      {
        new: true, // Return the updated document
        runValidators: true // Run schema validators
      }
    );

    if (!updatedSten) {
      // Either already solved, at max winners, or user already won
      const currentSten = await Sten.findById(id);
      if (currentSten.solved) {
        return res.status(403).json({ error: 'Sten already solved' });
      } else {
        return res.status(403).json({ error: 'Maximum winners reached' });
      }
    }

    res.status(200).json({
      success: true,
      message: decryptedMessage,
      currentWinners: updatedSten.currentWinners,
      solved: updatedSten.solved
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const sten = await Sten.findById(req.params.id);
    if (!sten) return res.status(404).json({ message: 'Sten not found' });

    // Update allowed fields (be careful with security)
    if (req.body.encryptedMessage != null) sten.encryptedMessage = req.body.encryptedMessage;
    if (req.body.iv != null) sten.iv = req.body.iv;
    if (req.body.passwordHash != null) sten.passwordHash = req.body.passwordHash;
    if (req.body.passwordSalt != null) sten.passwordSalt = req.body.passwordSalt;
    if (req.body.expiresAt != null) sten.expiresAt = req.body.expiresAt;
    if (req.body.maxWinners != null) sten.maxWinners = req.body.maxWinners;
    if (req.body.oneTime != null) sten.oneTime = req.body.oneTime;

    const updatedSten = await sten.save();
    res.json(updatedSten);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const sten = await Sten.findById(req.params.id);
    if (!sten) return res.status(404).json({ message: 'Sten not found' });

    await sten.remove();
    res.json({ message: 'Sten deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
