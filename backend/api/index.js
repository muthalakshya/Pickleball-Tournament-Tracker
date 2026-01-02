/**
 * Vercel Serverless Function Entry Point
 * 
 * This file is used when deploying to Vercel as serverless functions.
 * It exports the Express app for Vercel to handle.
 */

import '../server.js';

// Re-export the app (server.js exports it)
// This allows Vercel to use it as a serverless function
export { default } from '../server.js';

