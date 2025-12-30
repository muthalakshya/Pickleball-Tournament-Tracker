/**
 * Health Check Routes
 * 
 * This file defines routes related to server health and status checks.
 * Health check endpoints are useful for monitoring, load balancers, and
 * ensuring the API is responsive.
 */

import express from 'express';
import { healthCheck } from '../controllers/health.controller.js';

// Create router instance
const router = express.Router();

/**
 * GET /api/health
 * 
 * Health check endpoint that returns server status and basic information.
 * This endpoint can be used by monitoring tools to verify the API is running.
 */
router.get('/health', healthCheck);

// Export router to be used in server.js
export default router;

