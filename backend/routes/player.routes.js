import express from 'express';
import {
  createPlayer,
  getPlayers,
  getPlayer,
  updatePlayer,
  deletePlayer,
  bulkCreatePlayers,
} from '../controllers/player.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('organizer'));

router.route('/tournament/:tournamentId')
  .get(getPlayers)
  .post(createPlayer);

router.post('/tournament/:tournamentId/bulk', bulkCreatePlayers);

router.route('/:id')
  .get(getPlayer)
  .put(updatePlayer)
  .delete(deletePlayer);

export default router;

