import Team from '../models/Team.js';
import Tournament from '../models/Tournament.js';
import Player from '../models/Player.js';

/**
 * @desc    Create team
 * @route   POST /api/teams/tournament/:tournamentId
 * @access  Private (Organizer)
 */
export const createTeam = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const { name, player1, player2, seed } = req.body;

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

    if (tournament.tournamentType !== 'doubles') {
      return res.status(400).json({
        success: false,
        message: 'Teams can only be added to doubles tournaments',
      });
    }

    // Verify players exist and belong to tournament
    const p1 = await Player.findById(player1);
    const p2 = await Player.findById(player2);

    if (!p1 || !p2) {
      return res.status(404).json({
        success: false,
        message: 'One or both players not found',
      });
    }

    if (p1.tournament.toString() !== tournamentId || p2.tournament.toString() !== tournamentId) {
      return res.status(400).json({
        success: false,
        message: 'Players must belong to the same tournament',
      });
    }

    const team = await Team.create({
      name,
      tournament: tournamentId,
      player1,
      player2,
      seed: seed || null,
    });

    await team.populate('player1 player2');

    res.status(201).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all teams for a tournament
 * @route   GET /api/teams/tournament/:tournamentId
 * @access  Private
 */
export const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ tournament: req.params.tournamentId })
      .populate('player1 player2')
      .sort({ seed: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single team
 * @route   GET /api/teams/:id
 * @access  Private
 */
export const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('player1 player2');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update team
 * @route   PUT /api/teams/:id
 * @access  Private (Organizer)
 */
export const updateTeam = async (req, res, next) => {
  try {
    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate('player1 player2');

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete team
 * @route   DELETE /api/teams/:id
 * @access  Private (Organizer)
 */
export const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted',
    });
  } catch (error) {
    next(error);
  }
};

