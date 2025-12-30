import express from 'express';
import {
  getMatches,
  getMatch,
  updateMatch,
  updateScore,
  startMatch,
  completeMatch,
} from '../controllers/match.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route (for public tournament view)
router.get('/tournament/:tournamentId', getMatches);

// Protected routes
router.use(protect);

router.get('/:id', getMatch);
router.put('/:id', authorize('organizer'), updateMatch);
router.put('/:id/score', authorize('organizer'), updateScore);
router.put('/:id/start', authorize('organizer'), startMatch);
router.put('/:id/complete', authorize('organizer'), completeMatch);

export default router;

