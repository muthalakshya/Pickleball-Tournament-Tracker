/**
 * Authentication Routes
 * 
 * This file defines routes related to authentication.
 * Currently only includes admin login endpoint.
 * 
 * Security note: No registration endpoint exists. Admins must be
 * created manually through database operations or admin scripts.
 */

import express from 'express';
import { login } from '../controllers/auth.controller.js';

// Create router instance
const router = express.Router();

/**
 * POST /api/admin/login
 * 
 * Admin login endpoint. Authenticates admin credentials and returns JWT token.
 * 
 * Request body:
 * {
 *   "email": "admin@example.com",
 *   "password": "password123"
 * }
 * 
 * Response (success):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "jwt_token_here",
 *   "admin": {
 *     "id": "admin_id",
 *     "email": "admin@example.com",
 *     "role": "admin"
 *   }
 * }
 * 
 * Response (error):
 * {
 *   "success": false,
 *   "message": "Invalid email or password"
 * }
 */
router.post('/admin/login', login);

// Export router to be used in server.js
export default router;

