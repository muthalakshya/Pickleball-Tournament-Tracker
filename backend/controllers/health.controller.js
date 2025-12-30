/**
 * Health Check Controller
 * 
 * This file contains controller functions for health check endpoints.
 * Controllers handle the business logic and send responses to the client.
 * They act as the bridge between routes and services/models.
 */

/**
 * Health Check Controller Function
 * 
 * Returns the current health status of the server including:
 * - Server status (running/healthy)
 * - Timestamp of the check
 * - Uptime information
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const healthCheck = (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      message: 'Server is running successfully',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: 'Server health check failed',
      error: error.message
    });
  }
};

