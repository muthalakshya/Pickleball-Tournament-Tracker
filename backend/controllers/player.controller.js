import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';

/**
 * @desc    Create player
 * @route   POST /api/players/tournament/:tournamentId
 * @access  Private (Organizer)
 */
export const createPlayer = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const { name, seed } = req.body;

    // Verify tournament exists and user is organizer
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (tournament.tournamentType !== 'singles') {
      return res.status(400).json({
        success: false,
        message: 'Players can only be added to singles tournaments',
      });
    }

    const player = await Player.create({
      name,
      tournament: tournamentId,
      seed: seed || null,
    });

    res.status(201).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all players for a tournament
 * @route   GET /api/players/tournament/:tournamentId
 * @access  Private
 */
export const getPlayers = async (req, res, next) => {
  try {
    const players = await Player.find({ tournament: req.params.tournamentId })
      .sort({ seed: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single player
 * @route   GET /api/players/:id
 * @access  Private
 */
export const getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update player
 * @route   PUT /api/players/:id
 * @access  Private (Organizer)
 */
export const updatePlayer = async (req, res, next) => {
  try {
    let player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    player = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete player
 * @route   DELETE /api/players/:id
 * @access  Private (Organizer)
 */
export const deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    await player.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Player deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk create players
 * @route   POST /api/players/tournament/:tournamentId/bulk
 * @access  Private (Organizer)
 */
export const bulkCreatePlayers = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const { players } = req.body; // Array of { name, seed? }

    // Verify tournament exists and user is organizer
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (tournament.tournamentType !== 'singles') {
      return res.status(400).json({
        success: false,
        message: 'Players can only be added to singles tournaments',
      });
    }

    const playersData = players.map(p => ({
      name: p.name,
      tournament: tournamentId,
      seed: p.seed || null,
    }));

    const createdPlayers = await Player.insertMany(playersData, {
      ordered: false, // Continue on duplicate key errors
    });

    res.status(201).json({
      success: true,
      count: createdPlayers.length,
      data: createdPlayers,
    });
  } catch (error) {
    next(error);
  }
};

