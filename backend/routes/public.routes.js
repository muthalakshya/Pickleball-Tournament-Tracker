/**
 * Public Routes
 * 
 * This file defines public read-only routes for tournament viewing.
 * All routes are accessible without authentication and only return
 * tournaments where isPublic = true.
 * 
 * These routes are optimized for public display and use efficient
 * database queries with proper indexing.
 */

import express from 'express';
import {
  getAllTournaments,
  getTournamentById,
  getTournamentMatches,
  getTournamentStandings
} from '../controllers/public.controller.js';

// Create router instance
const router = express.Router();

/**
 * GET /api/public/tournaments
 * 
 * Get all public tournaments.
 * Returns list of tournaments sorted by status (live first) and creation date.
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 5,
 *   "data": [...]
 * }
 */
router.get('/tournaments', getAllTournaments);

/**
 * GET /api/public/tournaments/:id
 * 
 * Get single tournament by ID.
 * Only returns tournament if it's public.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {...}
 * }
 */
router.get('/tournaments/:id', getTournamentById);

/**
 * GET /api/public/tournaments/:id/matches
 * 
 * Get all matches for a tournament, grouped by status:
 * - past: completed matches
 * - live: currently live matches
 * - upcoming: scheduled matches
 * 
 * Response:
 * {
 *   "success": true,
 *   "tournament": {...},
 *   "matches": {
 *     "past": [...],
 *     "live": [...],
 *     "upcoming": [...]
 *   },
 *   "summary": {...}
 * }
 */
router.get('/tournaments/:id/matches', getTournamentMatches);

/**
 * GET /api/public/tournaments/:id/standings
 * 
 * Get tournament standings/point table.
 * Calculates wins, losses, points, and rankings based on completed matches.
 * 
 * Response:
 * {
 *   "success": true,
 *   "tournament": {...},
 *   "standings": [...],
 *   "summary": {...}
 * }
 */
router.get('/tournaments/:id/standings', getTournamentStandings);

// Export router to be used in server.js
export default router;

