/**
 * Public Tournament Controller
 * 
 * This file contains controller functions for public read-only tournament endpoints.
 * All endpoints are accessible without authentication and only return
 * tournaments where isPublic = true.
 * 
 * Optimized for public display with efficient queries and proper data formatting.
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Match from '../models/match.model.js';
import Participant from '../models/participant.model.js';
import { calculateStandings, sortStandings } from '../services/standings.service.js';

/**
 * Get All Public Tournaments
 * 
 * Returns a list of all public tournaments, sorted by status and creation date.
 * Optimized query using indexes for fast retrieval.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllTournaments = async (req, res) => {
  try {
    // Query only public tournaments, sorted by status (live first) and creation date
    // Uses compound index (isPublic: 1, status: 1) for optimal performance
    const tournaments = await Tournament.find({ isPublic: true })
      .select('-createdBy') // Exclude admin info from public response
      .sort({ status: 1, createdAt: -1 }) // Live tournaments first, then by newest
      .lean(); // Use lean() for better performance (returns plain JS objects)

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournaments',
      error: error.message
    });
  }
};

/**
 * Get Single Public Tournament by ID
 * 
 * Returns detailed information about a specific tournament.
 * Only returns tournament if it's public.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament only if it's public
    const tournament = await Tournament.findOne({
      _id: id,
      isPublic: true
    })
      .select('-createdBy') // Exclude admin info
      .lean();

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or not publicly available'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournament',
      error: error.message
    });
  }
};

/**
 * Get Tournament Matches
 * 
 * Returns all matches for a tournament, grouped by status:
 * - past: completed matches
 * - live: currently live matches
 * - upcoming: scheduled matches
 * 
 * Optimized for public display with populated participant data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTournamentMatches = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Verify tournament exists and is public
    const tournament = await Tournament.findOne({
      _id: id,
      isPublic: true
    }).lean();

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or not publicly available'
      });
    }

    // Fetch all matches for this tournament with populated participant data
    // Uses index (tournamentId: 1, status: 1) for optimal performance
    const matches = await Match.find({ tournamentId: id })
      .populate('participantA', 'name players')
      .populate('participantB', 'name players')
      .sort({ status: 1, order: 1, createdAt: 1 }) // Live first, then by order
      .lean();

    // Group matches by status for easy frontend consumption
    const groupedMatches = {
      past: matches.filter(match => match.status === 'completed'),
      live: matches.filter(match => match.status === 'live'),
      upcoming: matches.filter(match => match.status === 'upcoming'),
      cancelled: matches.filter(match => match.status === 'cancelled')
    };

    // Sort past matches by most recent first
    groupedMatches.past.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Sort upcoming matches by order and creation date
    groupedMatches.upcoming.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Sort cancelled matches by most recent first
    groupedMatches.cancelled.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.status(200).json({
      success: true,
      tournament: {
        id: tournament._id,
        name: tournament.name,
        status: tournament.status,
        currentRound: tournament.currentRound
      },
      matches: groupedMatches,
      summary: {
        total: matches.length,
        past: groupedMatches.past.length,
        live: groupedMatches.live.length,
        upcoming: groupedMatches.upcoming.length,
        cancelled: groupedMatches.cancelled.length
      }
    });
  } catch (error) {
    console.error('Error fetching tournament matches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournament matches',
      error: error.message
    });
  }
};

/**
 * Get Tournament Standings
 * 
 * Calculates and returns point table/standings for a tournament.
 * Standings are based on completed matches and include:
 * - Wins, Losses, Points, Win Rate
 * 
 * For group/roundRobin formats, calculates standings.
 * For knockout format, shows bracket progression.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTournamentStandings = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Verify tournament exists and is public
    const tournament = await Tournament.findOne({
      _id: id,
      isPublic: true
    }).lean();

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or not publicly available'
      });
    }

    // Get all participants for this tournament
    const participants = await Participant.find({ tournamentId: id })
      .sort({ name: 1 })
      .lean();

    // Get all completed matches for this tournament
    const completedMatches = await Match.find({
      tournamentId: id,
      status: 'completed'
    })
      .populate('participantA', 'name players')
      .populate('participantB', 'name players')
      .lean();

    // Calculate standings for each participant
    let standings = calculateStandings(participants, completedMatches);

    // Sort standings with tie-breaking rules (includes head-to-head)
    standings = sortStandings(standings, completedMatches);

    res.status(200).json({
      success: true,
      tournament: {
        id: tournament._id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status,
        currentRound: tournament.currentRound
      },
      standings: standings,
      summary: {
        totalParticipants: participants.length,
        totalMatches: completedMatches.length,
        completedMatches: completedMatches.length
      }
    });
  } catch (error) {
    console.error('Error fetching tournament standings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournament standings',
      error: error.message
    });
  }
};

