import cors from 'cors'
import express from 'express'
import stenRoutes from './routes/sten.routes.js'

const app = express()

// CORS middleware - allows frontend origin only
app.use(
	cors({
		origin: [
			'http://localhost:5174', // Vite development server
			'http://localhost:5173', // Alternative Vite port
			'https://sten-llsp.onrender.com', // Production deployment
			'http://127.0.0.1:5174', // Alternative localhost
			'http://127.0.0.1:5173', // Alternative localhost
		],
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		optionsSuccessStatus: 200,
	})
)

// Body parsing middleware (increase limits to accept base64 images from frontend)
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))

// Routes
app.use('/api/sten', stenRoutes)

// Default route - JSON response only
app.get('/', (req, res) => {
	res.json({
		message: 'STEN Backend API',
		version: '1.0.0',
		endpoints: {
			sten: '/api/sten',
		},
	})
})

// 404 handler for unknown routes
app.use('*', (req, res) => {
	res.status(404).json({ error: 'Route not found' })
})

export default app
