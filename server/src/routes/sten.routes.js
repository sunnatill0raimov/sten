import express from 'express'
import * as stenController from '../controllers/sten.controller.js'

const router = express.Router()

// GET /api/sten
router.get('/', stenController.getAll)

// GET /api/sten/:id
router.get('/:id', stenController.getById)

// GET /api/sten/:id/status
router.get('/:id/status', stenController.getStatus)

// POST /api/sten/create
router.post('/create', stenController.createSten)

// PUT /api/sten/:id
router.put('/:id', stenController.update)

// POST /api/sten/:id/view
router.post('/:id/view', stenController.viewSten)

// POST /api/sten/:id/solve
router.post('/:id/solve', stenController.solve)

// DELETE /api/sten/:id
router.delete('/:id', stenController.remove)

export default router
