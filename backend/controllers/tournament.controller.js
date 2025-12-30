import Tournament from '../models/Tournament.js';
import { generateFixturesService } from '../services/fixtureGenerator.js';

/**
 * @desc    Create new tournament
 * @route   POST /api/tournaments
 * @access  Private (Organizer)
 */
export const createTournament = async (req, res, next) => {
  try {
    const tournamentData = {
      ...req.body,
      organizer: req.user.id,
      tournamentTypeRef: req.body.tournamentType === 'singles' ? 'Player' : 'Team',
    };

    const tournament = await Tournament.create(tournamentData);

    res.status(201).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tournaments
 * @route   GET /api/tournaments
 * @access  Private
 */
export const getTournaments = async (req, res, next) => {
  try {
    // If organizer, show their tournaments; if viewer, show public tournaments
    const query = req.user.role === 'organizer'
      ? { organizer: req.user.id }
      : { isPublic: true };

    const tournaments = await Tournament.find(query)
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single tournament
 * @route   GET /api/tournaments/:id
 * @access  Public (for public view) / Private
 */
export const getTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'name email');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Check if tournament is public or user is organizer
    if (!tournament.isPublic && (!req.user || tournament.organizer._id.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this tournament',
      });
    }

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update tournament
 * @route   PUT /api/tournaments/:id
 * @access  Private (Organizer)
 */
export const updateTournament = async (req, res, next) => {
  try {
    let tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Make sure user is tournament organizer
    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tournament',
      });
    }

    tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete tournament
 * @route   DELETE /api/tournaments/:id
 * @access  Private (Organizer)
 */
export const deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Make sure user is tournament organizer
    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tournament',
      });
    }

    await tournament.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tournament deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate fixtures for tournament
 * @route   POST /api/tournaments/:id/generate-fixtures
 * @access  Private (Organizer)
 */
export const generateFixtures = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Make sure user is tournament organizer
    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate fixtures for this tournament',
      });
    }

    const matches = await generateFixturesService(tournament);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

