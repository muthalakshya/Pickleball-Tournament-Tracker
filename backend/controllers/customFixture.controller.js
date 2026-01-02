/**
 * Custom Fixture Controller
 * 
 * Handles manual fixture generation for custom tournaments.
 * Allows admins to create rounds with matches manually.
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';
import Match from '../models/match.model.js';

/**
 * Create Custom Round
 * 
 * Creates a new round with matches for a custom tournament.
 * - Randomly pairs participants
 * - Handles odd numbers with TBD
 * - Does NOT auto-complete tournament
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createCustomRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { roundName, participantIds, topPlayers } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Validation: Round name required
    if (!roundName || !roundName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Round name is required'
      });
    }

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create rounds for this tournament'
      });
    }

    // Validation: Must be custom tournament
    if (tournament.format !== 'custom') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is only for custom tournaments'
      });
    }

    // Get participants
    let participants;
    if (participantIds && participantIds.length > 0) {
      // Use provided participant IDs (for subsequent rounds with top players)
      participants = await Participant.find({
        _id: { $in: participantIds },
        tournamentId: id
      }).lean();
    } else {
      // Get all participants for first round
      participants = await Participant.find({ tournamentId: id }).lean();
    }

    if (participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 participants are required to create matches'
      });
    }

    // Check if round already exists
    const existingMatches = await Match.find({
      tournamentId: id,
      round: roundName.trim()
    });

    if (existingMatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Round "${roundName}" already exists. Please use a different round name or delete existing matches.`
      });
    }

    // Shuffle participants randomly
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const matches = [];
    const hasOddNumber = shuffled.length % 2 !== 0;

    // Create matches
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({
        tournamentId: id,
        round: roundName.trim(),
        participantA: shuffled[i]._id,
        participantB: shuffled[i + 1]._id,
        score: { a: 0, b: 0 },
        status: 'upcoming',
        order: matches.length,
        courtNumber: null
      });
    }

    // If odd number, create a match with TBD
    if (hasOddNumber) {
      matches.push({
        tournamentId: id,
        round: roundName.trim(),
        participantA: shuffled[shuffled.length - 1]._id,
        participantB: null, // TBD
        score: { a: 0, b: 0 },
        status: 'upcoming',
        order: matches.length,
        courtNumber: null
      });
    }

    // Create matches in database
    const createdMatches = await Match.insertMany(matches);

    // Update tournament currentRound if not set
    if (!tournament.currentRound) {
      tournament.currentRound = roundName.trim();
      await tournament.save();
    }

    // Populate matches for response
    const populatedMatches = await Match.find({
      _id: { $in: createdMatches.map(m => m._id) }
    })
      .populate('participantA', 'name players')
      .populate('participantB', 'name players')
      .sort({ order: 1 })
      .lean();

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdMatches.length} match(es) for round "${roundName}"`,
      data: {
        round: roundName.trim(),
        matches: populatedMatches,
        count: createdMatches.length,
        hasTBD: hasOddNumber
      }
    });
  } catch (error) {
    console.error('Error creating custom round:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating custom round',
      error: error.message
    });
  }
};

/**
 * Get Rounds for Custom Tournament
 * 
 * Gets all rounds with matches grouped by round name.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCustomRounds = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view rounds for this tournament'
      });
    }

    // Get all matches grouped by round
    const matches = await Match.find({ tournamentId: id })
      .populate('participantA', 'name players')
      .populate('participantB', 'name players')
      .sort({ round: 1, order: 1 })
      .lean();

    // Group by round
    const roundsMap = {};
    matches.forEach(match => {
      if (!roundsMap[match.round]) {
        roundsMap[match.round] = {
          roundName: match.round,
          matches: [],
          stats: {
            total: 0,
            upcoming: 0,
            live: 0,
            completed: 0,
            cancelled: 0
          }
        };
      }
      roundsMap[match.round].matches.push(match);
      roundsMap[match.round].stats.total++;
      roundsMap[match.round].stats[match.status]++;
    });

    const rounds = Object.values(roundsMap);

    res.status(200).json({
      success: true,
      data: {
        tournament: {
          id: tournament._id,
          name: tournament.name,
          format: tournament.format,
          currentRound: tournament.currentRound
        },
        rounds: rounds,
        summary: {
          totalRounds: rounds.length,
          totalMatches: matches.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching custom rounds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom rounds',
      error: error.message
    });
  }
};

