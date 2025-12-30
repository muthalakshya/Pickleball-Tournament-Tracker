import express from 'express';
import {
  createTournament,
  getTournaments,
  getTournament,
  updateTournament,
  deleteTournament,
  generateFixtures,
} from '../controllers/tournament.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route (for public tournament view)
router.get('/public/:id', getTournament);

// Protected routes
router.use(protect);

router.route('/')
  .get(getTournaments)
  .post(authorize('organizer'), createTournament);

router.route('/:id')
  .get(getTournament)
  .put(authorize('organizer'), updateTournament)
  .delete(authorize('organizer'), deleteTournament);

router.post('/:id/generate-fixtures', authorize('organizer'), generateFixtures);

export default router;

