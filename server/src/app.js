import express from 'express';
import cors from 'cors';
import stenRoutes from './routes/sten.routes.js';

const app = express();

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/sten', stenRoutes);

// Default route - JSON response only
app.get('/', (req, res) => {
  res.json({
    message: 'STEN Backend API',
    version: '1.0.0',
    endpoints: {
      sten: '/api/sten'
    }
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
