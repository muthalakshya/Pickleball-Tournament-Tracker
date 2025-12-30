/**
 * Authentication Controller
 * 
 * This file contains controller functions for authentication endpoints.
 * Handles admin login and JWT token generation.
 * 
 * Security considerations:
 * - No registration endpoint - admins must be created manually
 * - Passwords are never returned in responses
 * - JWT tokens have expiration times
 * - Generic error messages prevent user enumeration attacks
 */

import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';

/**
 * Generate JWT Token
 * 
 * Creates a JSON Web Token for authenticated admin users.
 * 
 * Security decision: We use a short expiration time (24 hours) to limit
 * the window of opportunity if a token is compromised. The token contains
 * only the admin ID and role - no sensitive information.
 * 
 * @param {string} adminId - MongoDB ObjectId of the admin
 * @returns {string} - JWT token
 */
const generateToken = (adminId) => {
  return jwt.sign(
    { id: adminId, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Token expires in 24 hours
  );
};

/**
 * Admin Login Controller
 * 
 * Authenticates an admin user by verifying email and password.
 * Returns a JWT token upon successful authentication.
 * 
 * Security decisions:
 * 1. Generic error message for invalid credentials prevents user enumeration
 * 2. Password is not included in response (select: false in model)
 * 3. Token is only issued after successful password verification
 * 4. Uses bcrypt.compare which is resistant to timing attacks
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin by email and include password field (normally excluded)
    // Security: We explicitly select password here for comparison
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    // Generic error message to prevent user enumeration
    // Don't reveal whether email exists or password is wrong
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare provided password with hashed password in database
    // Security: bcrypt.compare handles timing attacks internally
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(admin._id);

    // Return success response with token
    // Security: Never return password or sensitive admin data
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

