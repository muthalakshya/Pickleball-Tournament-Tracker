/**
 * Admin Routes
 * 
 * This file defines admin-only routes for tournament management.
 * All routes require authentication via authenticateAdmin middleware.
 * 
 * Routes:
 * - POST /api/admin/tournaments - Create tournament (always as draft)
 * - PUT /api/admin/tournaments/:id - Update tournament
 * - DELETE /api/admin/tournaments/:id - Delete tournament
 * - PATCH /api/admin/tournaments/:id/status - Update tournament status
 */

import express from 'express';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';
import {
  createTournament,
  getAllTournaments,
  getTournament,
  updateTournament,
  deleteTournament,
  updateTournamentStatus,
  toggleTournamentPublic
} from '../controllers/admin.controller.js';
import { 
  uploadParticipants as uploadParticipantsController,
  getTournamentParticipants
} from '../controllers/participant.controller.js';
import { uploadParticipants as uploadMiddleware } from '../middlewares/upload.middleware.js';
import { generateTournamentFixtures } from '../controllers/fixture.controller.js';
import {
  createMatch,
  updateMatch,
  updateMatchScore,
  completeMatch,
  deleteMatch,
  cancelMatch,
  getMatchById,
  getTournamentMatchesAdmin
} from '../controllers/match.controller.js';

// Create router instance
const router = express.Router();

// Apply authentication middleware to all routes in this router
// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * POST /api/admin/tournaments
 * 
 * Create a new tournament. Always creates as draft status.
 * 
 * Request body:
 * {
 *   "name": "Summer Tournament 2024",
 *   "type": "doubles",
 *   "format": "roundRobin",
 *   "rules": {
 *     "points": 11,
 *     "scoringSystem": "rally"
 *   },
 *   "currentRound": "Group Stage",
 *   "isPublic": true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Tournament created successfully",
 *   "data": {...}
 * }
 */
router.post('/tournaments', createTournament);

/**
 * GET /api/admin/tournaments
 * 
 * Get all tournaments created by the authenticated admin.
 * Returns all tournaments regardless of isPublic status.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [...],
 *   "count": 10
 * }
 */
router.get('/tournaments', getAllTournaments);

/**
 * GET /api/admin/tournaments/:id
 * 
 * Get a single tournament by ID. Only the creator can view it.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {...}
 * }
 */
router.get('/tournaments/:id', getTournament);

/**
 * PUT /api/admin/tournaments/:id
 * 
 * Update an existing tournament. Only the creator can update.
 * Rules can only be edited when tournament is in draft status.
 * 
 * Request body (all fields optional):
 * {
 *   "name": "Updated Tournament Name",
 *   "type": "singles",
 *   "format": "knockout",
 *   "rules": { ... },  // Only editable in draft
 *   "currentRound": "Quarter Finals",
 *   "isPublic": false
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Tournament updated successfully",
 *   "data": {...}
 * }
 */
router.put('/tournaments/:id', updateTournament);

/**
 * DELETE /api/admin/tournaments/:id
 * 
 * Delete a tournament. Only the creator can delete.
 * Live tournaments cannot be deleted.
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Tournament deleted successfully"
 * }
 */
router.delete('/tournaments/:id', deleteTournament);

/**
 * PATCH /api/admin/tournaments/:id/status
 * 
 * Update tournament status. Only the creator can update.
 * 
 * Allowed transitions:
 * - draft -> live
 * - live -> completed
 * 
 * Request body:
 * {
 *   "status": "live"  // or "completed"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Tournament status updated to live",
 *   "data": {...}
 * }
 */
router.patch('/tournaments/:id/status', updateTournamentStatus);

/**
 * PATCH /api/admin/tournaments/:id/toggle-public
 * 
 * Toggle the isPublic status of a tournament (publish/unpublish).
 * Only the creator can toggle this.
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Tournament published successfully",
 *   "data": {...}
 * }
 */
router.patch('/tournaments/:id/toggle-public', toggleTournamentPublic);

/**
 * GET /api/admin/tournaments/:id/participants
 * 
 * Get all participants for a tournament.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "tournament": {...},
 *     "participants": [...],
 *     "count": 10
 *   }
 * }
 */
router.get('/tournaments/:id/participants', getTournamentParticipants);

/**
 * POST /api/admin/tournaments/:id/upload-participants
 * 
 * Bulk upload participants from CSV or Excel file.
 * 
 * Request: multipart/form-data
 * - file: CSV or Excel file (.csv, .xlsx, .xls)
 * 
 * Expected file format:
 * For singles:
 *   name,player1
 *   Team A,John Doe
 *   Team B,Jane Smith
 * 
 * For doubles:
 *   name,player1,player2
 *   Team A,John Doe,Jane Doe
 *   Team B,Bob Smith,Alice Smith
 * 
 * Validations:
 * - No duplicate names in file
 * - No duplicate names in existing tournament participants
 * - Minimum 2 participants required
 * - Player 1 required for all
 * - Player 2 required for doubles tournaments
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Successfully uploaded 10 participants",
 *   "data": {
 *     "count": 10,
 *     "participants": [...],
 *     "tournament": {...}
 *   }
 * }
 */
router.post(
  '/tournaments/:id/upload-participants',
  uploadMiddleware,
  uploadParticipantsController
);

/**
 * POST /api/admin/tournaments/:id/generate-fixtures
 * 
 * Generate tournament fixtures/matches automatically based on format.
 * 
 * Request body (optional):
 * {
 *   "groupSize": 4  // For group format only, default: 4
 * }
 * 
 * Algorithm Selection:
 * - roundRobin: Each participant plays every other participant once
 * - group: Participants divided into groups, round robin within each group
 * - knockout: Single elimination bracket with byes for odd counts
 * 
 * Validations:
 * - Tournament must be in draft status
 * - At least 2 participants required
 * - No existing matches (delete first to regenerate)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Successfully generated 15 matches",
 *   "data": {
 *     "tournament": {...},
 *     "matches": {
 *       "total": 15,
 *       "byRound": {...},
 *       "all": [...]
 *     },
 *     "summary": {...}
 *   }
 * }
 */
router.post('/tournaments/:id/generate-fixtures', generateTournamentFixtures);

/**
 * GET /api/admin/tournaments/:id/matches
 * 
 * Get all matches for a tournament (admin only).
 * Does not check isPublic status - admin can see all their tournaments.
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
router.get('/tournaments/:id/matches', getTournamentMatchesAdmin);

/**
 * GET /api/admin/matches/:id
 * 
 * Get a single match by ID with populated participant data.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "match": {...},
 *     "winner": {...}  // null if match not completed
 *   }
 * }
 */
router.get('/matches/:id', getMatchById);

/**
 * POST /api/admin/matches
 * 
 * Create a new match manually.
 * 
 * Request body:
 * {
 *   "tournamentId": "...",
 *   "round": "Quarter Finals",
 *   "participantA": "...",
 *   "participantB": "...",
 *   "status": "upcoming",  // optional, default: "upcoming"
 *   "courtNumber": 1,  // optional
 *   "order": 0  // optional, default: 0
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Match created successfully",
 *   "data": {...}
 * }
 */
router.post('/matches', createMatch);

/**
 * PUT /api/admin/matches/:id
 * 
 * Update match details (round, participants, court, order, status, scores).
 * More comprehensive than updateMatchScore.
 * 
 * Request body (all fields optional):
 * {
 *   "round": "Semi Finals",
 *   "participantA": "...",
 *   "participantB": "...",
 *   "status": "live",
 *   "courtNumber": 2,
 *   "order": 1,
 *   "scoreA": 5,
 *   "scoreB": 3
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Match updated successfully",
 *   "data": {...}
 * }
 */
router.put('/matches/:id', updateMatch);

/**
 * PUT /api/admin/matches/:id/score
 * 
 * Update match score and/or status.
 * 
 * Request body:
 * {
 *   "scoreA": 11,
 *   "scoreB": 9,
 *   "status": "completed",  // optional: "upcoming", "live", "completed"
 *   "courtNumber": 1  // optional
 * }
 * 
 * Validations:
 * - Round must not be locked (for knockout tournaments)
 * - Scores must be non-negative
 * - Admin must own the tournament
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Match updated successfully",
 *   "data": {
 *     "match": {...},
 *     "progression": {...}  // Tournament progression info if match completed
 *   }
 * }
 */
router.put('/matches/:id/score', updateMatchScore);

/**
 * POST /api/admin/matches/:id/complete
 * 
 * Complete a match and process tournament progression.
 * 
 * Request body:
 * {
 *   "scoreA": 11,
 *   "scoreB": 9
 * }
 * 
 * Features:
 * - Marks match as completed
 * - Determines winner
 * - Checks if round is complete
 * - Generates next round (for knockout tournaments)
 * - Updates tournament currentRound
 * - Locks previous rounds
 * 
 * Validations:
 * - Both scores required
 * - Scores must be different (no draws)
 * - Round must not be locked
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Match completed successfully",
 *   "data": {
 *     "match": {...},
 *     "winner": {...},
 *     "progression": {
 *       "matchCompleted": true,
 *       "roundComplete": true,
 *       "nextRoundGenerated": true,
 *       "tournamentComplete": false,
 *       "updatedRounds": ["Semi Finals"]
 *     }
 *   }
 * }
 */
router.post('/matches/:id/complete', completeMatch);

/**
 * DELETE /api/admin/matches/:id
 * 
 * Delete a match. Cannot delete matches in locked rounds.
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Match deleted successfully"
 * }
 */
router.delete('/matches/:id', deleteMatch);

/**
 * POST /api/admin/matches/:id/cancel
 * 
 * Cancel a match by resetting it to 'upcoming' status and clearing scores.
 * Cannot cancel completed matches.
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Match cancelled successfully",
 *   "data": {...}
 * }
 */
router.post('/matches/:id/cancel', cancelMatch);

// Export router to be used in server.js
export default router;

