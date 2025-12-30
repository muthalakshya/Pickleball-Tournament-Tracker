import Match from '../models/Match.js';
import Tournament from '../models/Tournament.js';
import { updateMatchProgression } from '../services/matchProgression.js';

/**
 * @desc    Get all matches for a tournament
 * @route   GET /api/matches/tournament/:tournamentId
 * @access  Public
 */
export const getMatches = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const { round, status, group } = req.query;

    const query = { tournament: tournamentId };
    if (round) query.round = round;
    if (status) query.status = status;
    if (group) query.group = group;

    const matches = await Match.find(query)
      .populate('player1 player2 team1 team2 winner')
      .sort({ matchNumber: 1, round: 1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single match
 * @route   GET /api/matches/:id
 * @access  Private
 */
export const getMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('player1 player2 team1 team2 winner tournament');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update match
 * @route   PUT /api/matches/:id
 * @access  Private (Organizer)
 */
export const updateMatch = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate('player1 player2 team1 team2 winner');

    // Emit Socket.IO event
    const io = req.app.locals.io;
    if (io) {
      io.to(`tournament-${match.tournament}`).emit('match_updated', match);
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update match score
 * @route   PUT /api/matches/:id/score
 * @access  Private (Organizer)
 */
export const updateScore = async (req, res, next) => {
  try {
    const { score1, score2, sets } = req.body;

    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    match.score1 = score1 ?? match.score1;
    match.score2 = score2 ?? match.score2;
    if (sets) match.sets = sets;

    await match.save();

    const tournament = await Tournament.findById(match.tournament);
    
    // Validate winning score
    const pointsToWin = tournament.pointsToWin || 11;
    const winByTwo = true; // Standard pickleball rule

    // Determine winner if score is valid
    if (match.score1 >= pointsToWin && match.score1 - match.score2 >= 2) {
      match.winner = match.player1 || match.team1;
      match.winnerModel = tournament.tournamentType === 'singles' ? 'Player' : 'Team';
    } else if (match.score2 >= pointsToWin && match.score2 - match.score1 >= 2) {
      match.winner = match.player2 || match.team2;
      match.winnerModel = tournament.tournamentType === 'singles' ? 'Player' : 'Team';
    }

    await match.save();
    await match.populate('player1 player2 team1 team2 winner');

    // Emit Socket.IO event
    const io = req.app.locals.io;
    if (io) {
      io.to(`tournament-${match.tournament}`).emit('score_updated', match);
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start match
 * @route   PUT /api/matches/:id/start
 * @access  Private (Organizer)
 */
export const startMatch = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    match.status = 'in-progress';
    if (req.body.court) match.court = req.body.court;
    if (req.body.scheduledTime) match.scheduledTime = req.body.scheduledTime;

    await match.save();
    await match.populate('player1 player2 team1 team2');

    // Emit Socket.IO event
    const io = req.app.locals.io;
    if (io) {
      io.to(`tournament-${match.tournament}`).emit('match_started', match);
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete match
 * @route   PUT /api/matches/:id/complete
 * @access  Private (Organizer)
 */
export const completeMatch = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    if (!match.winner) {
      return res.status(400).json({
        success: false,
        message: 'Match must have a winner before completion',
      });
    }

    match.status = 'completed';
    match.completedAt = new Date();

    await match.save();
    await match.populate('player1 player2 team1 team2 winner');

    // Update match progression (advance winner to next round)
    await updateMatchProgression(match);

    // Emit Socket.IO event
    const io = req.app.locals.io;
    if (io) {
      io.to(`tournament-${match.tournament}`).emit('match_completed', match);
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

