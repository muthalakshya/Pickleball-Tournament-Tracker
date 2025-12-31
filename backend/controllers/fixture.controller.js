/**
 * Fixture Controller
 * 
 * This file contains controller functions for fixture generation.
 * Handles automatic match generation based on tournament format.
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';
import Match from '../models/match.model.js';
import { generateFixtures } from '../services/fixture.service.js';

/**
 * Generate Tournament Fixtures
 * 
 * Automatically generates matches/fixtures for a tournament based on:
 * - Tournament format (group, roundRobin, knockout)
 * - Participant count
 * - Handles odd counts with byes (for knockout)
 * 
 * Features:
 * - Validates tournament exists and admin owns it
 * - Checks tournament has participants
 * - Prevents duplicate fixture generation
 * - Saves all generated matches to database
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateTournamentFixtures = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupSize } = req.body; // Optional: for group format

    // Validate MongoDB ObjectId format
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
    // Convert both ObjectIds to strings for reliable comparison
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to generate fixtures for this tournament'
      });
    }

    // Validation: Fixtures can only be generated before tournament goes live
    // Admin override only allowed before tournament goes live
    if (tournament.status === 'live' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Fixtures can only be generated for tournaments in draft status. Cannot modify fixtures once tournament is live or completed.'
      });
    }

    // Get all participants for this tournament
    const participants = await Participant.find({ tournamentId: id })
      .select('_id name players')
      .lean();

    // Validation: Check minimum participant count
    const MIN_PARTICIPANTS = 2;
    if (participants.length < MIN_PARTICIPANTS) {
      return res.status(400).json({
        success: false,
        message: `Tournament requires at least ${MIN_PARTICIPANTS} participants. Found ${participants.length}.`
      });
    }

    // Check if matches already exist for this tournament
    const existingMatches = await Match.countDocuments({ tournamentId: id });
    if (existingMatches > 0) {
      return res.status(400).json({
        success: false,
        message: 'Fixtures already exist for this tournament. Delete existing matches first to regenerate.',
        existingMatchCount: existingMatches
      });
    }

    // Extract participant IDs for fixture generation
    const participantIds = participants.map(p => p._id);

    // Generate fixtures based on tournament format
    let generatedMatches;
    try {
      generatedMatches = generateFixtures(tournament.format, participantIds, {
        groupSize: groupSize || 4
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Error generating fixtures',
        error: error.message
      });
    }

    // Validation: Check if any matches were generated
    if (!generatedMatches || generatedMatches.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No matches could be generated. Please check tournament format and participant count.'
      });
    }

    // Transform matches for database insertion
    // Note: For knockout, some matches may have null participants (TBD)
    const matchesToCreate = generatedMatches.map(match => ({
      tournamentId: id,
      round: match.round,
      participantA: match.participantA || null, // Can be null for TBD in knockout
      participantB: match.participantB || null, // Can be null for TBD in knockout
      score: {
        a: 0,
        b: 0
      },
      status: 'upcoming',
      order: match.order,
      courtNumber: null // Can be assigned later
    }));

    // Save matches to database
    const createdMatches = await Match.insertMany(matchesToCreate);

    // Update tournament currentRound if not set
    if (!tournament.currentRound && createdMatches.length > 0) {
      // Extract first round name from first match
      const firstRound = createdMatches[0].round;
      tournament.currentRound = firstRound;
      await tournament.save();
    }

    // Populate participant data for response
    const populatedMatches = await Match.find({ _id: { $in: createdMatches.map(m => m._id) } })
      .populate('participantA', 'name players')
      .populate('participantB', 'name players')
      .sort({ order: 1 })
      .lean();

    // Group matches by round for better response structure
    const matchesByRound = {};
    populatedMatches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    res.status(201).json({
      success: true,
      message: `Successfully generated ${createdMatches.length} matches`,
      data: {
        tournament: {
          id: tournament._id,
          name: tournament.name,
          format: tournament.format,
          type: tournament.type,
          currentRound: tournament.currentRound
        },
        matches: {
          total: createdMatches.length,
          byRound: matchesByRound,
          all: populatedMatches
        },
        summary: {
          participants: participants.length,
          matchesGenerated: createdMatches.length,
          rounds: Object.keys(matchesByRound).length
        }
      }
    });
  } catch (error) {
    console.error('Error generating fixtures:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating tournament fixtures',
      error: error.message
    });
  }
};

