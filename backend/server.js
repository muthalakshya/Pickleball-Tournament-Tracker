/**
 * Server Entry Point
 * 
 * This is the main entry point for the Express backend server.
 * It initializes the Express application, loads environment variables,
 * sets up middleware, and starts the HTTP server.
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { connectDB } from './config/db.js';
import { initializeSocketIO } from './sockets/socket.io.js';

// Load environment variables from .env file
dotenv.config();

// Create Express application instance
const app = express();

// Get port from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// CORS Configuration
// Allow requests from frontend origin
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware: Enable CORS
app.use(cors(corsOptions));

// Middleware: Parse JSON request bodies
// This allows the server to automatically parse JSON data from incoming requests
app.use(express.json());

// Middleware: Parse URL-encoded request bodies
// This handles form submissions and URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Database: Connect to MongoDB
// This must be called before starting the server
connectDB().catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

// Routes: Mount API routes
// All API routes will be prefixed with /api

// Public routes (no authentication required)
app.use('/api', healthRoutes);

// Public tournament viewing routes (no authentication required)
app.use('/api/public', publicRoutes);

// Authentication routes (login endpoint - public, but returns protected token)
app.use('/api', authRoutes);

// Admin routes (require authentication)
app.use('/api/admin', adminRoutes);

// Root route: Basic server information
app.get('/', (req, res) => {
  res.json({
    message: 'Pickleball Tournament API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware: Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.IO server ready for real-time updates`);
});

// Export app for testing purposes
export default app;

