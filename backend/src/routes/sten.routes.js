import express from 'express'
import * as stenController from '../controllers/sten.controller.js'

const router = express.Router()

// GET /api/sten
router.get('/', stenController.getAll)

// POST /api/sten/create (must be before /:id routes)
router.post('/create', stenController.createSten)

// SPECIFIC routes with /:id MUST come BEFORE generic /:id route
// GET /api/sten/:id/metadata
router.get('/:id/metadata', stenController.getStenMetadata)

// GET /api/sten/:id/status
router.get('/:id/status', stenController.getStatus)

// POST /api/sten/:id/unlock
router.post('/:id/unlock', stenController.unlockSten)

// POST /api/sten/:id/view
router.post('/:id/view', stenController.viewSten)

// POST /api/sten/:id/solve
router.post('/:id/solve', stenController.solve)

// GENERIC /:id routes MUST come AFTER specific routes
// GET /api/sten/:id
router.get('/:id', stenController.getById)

// PUT /api/sten/:id
router.put('/:id', stenController.update)

// DELETE /api/sten/:id
router.delete('/:id', stenController.remove)

export default router
