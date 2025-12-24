import express from 'express'
import * as stenController from '../controllers/sten.controller.js'
import multer from 'multer'

const router = express.Router()

// GET /api/sten - Get all stens (admin endpoint)
router.get('/', stenController.getAll)

// POST /api/sten - Create a new sten (main endpoint)
router.post('/', stenController.upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'attachment', maxCount: 1 }
]), stenController.createSten)

// POST /api/sten/create (legacy endpoint - redirects to main create)
router.post('/create', stenController.createSten)

// GET /api/sten/:id - Get sten metadata/info
router.get('/:id', stenController.getStenMetadata)

// POST /api/sten/:id/view - View/access sten content
router.post('/:id/view', stenController.viewSten)

// POST /api/sten/:id/solve - Legacy endpoint (redirects to view)
router.post('/:id/solve', stenController.solve)

// PUT /api/sten/:id - Update sten (admin endpoint)
router.put('/:id', stenController.update)

// DELETE /api/sten/:id - Delete sten (admin endpoint)
router.delete('/:id', stenController.remove)

export default router
