/**
 * Authentication Middleware
 * 
 * This middleware protects admin-only routes by verifying JWT tokens.
 * It extracts the token from the Authorization header, verifies it,
 * and attaches admin information to the request object.
 * 
 * Security decisions:
 * 1. Token must be in Authorization header as "Bearer <token>"
 * 2. Token is verified using JWT_SECRET from environment variables
 * 3. Only admins (role: 'admin') can access protected routes
 * 4. Failed authentication returns 401 Unauthorized
 * 5. This middleware is applied selectively to admin routes only
 */

import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';

/**
 * Authenticate Admin Middleware
 * 
 * Verifies JWT token and ensures the user is an admin.
 * On success, attaches admin information to req.admin for use in route handlers.
 * 
 * Security considerations:
 * - Token verification uses JWT_SECRET to prevent token tampering
 * - Checks token expiration automatically
 * - Verifies admin still exists in database (handles deleted admins)
 * - Only allows 'admin' role to pass through
 * 
 * Usage:
 * Apply this middleware to routes that require admin authentication:
 * router.get('/protected-route', authenticateAdmin, controllerFunction)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.'
      });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing.'
      });
    }

    // Verify token and decode payload
    // jwt.verify throws error if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify admin still exists in database
    // This handles cases where admin was deleted after token was issued
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found. Please login again.'
      });
    }

    // Verify admin role (defense in depth)
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Attach admin information to request object
    // This allows route handlers to access admin data without querying again
    req.admin = {
      id: admin._id,
      email: admin.email,
      role: admin.role
    };

    // Proceed to next middleware or route handler
    next();

  } catch (error) {
    // Handle JWT verification errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please login again.'
      });
    }

    // Handle other errors
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.'
    });
  }
};

