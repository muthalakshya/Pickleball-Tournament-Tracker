/**
 * Socket Service
 * 
 * This service provides helper functions for emitting Socket.IO events
 * from various parts of the application.
 * 
 * Events:
 * - tournament_live: Tournament status changed to live
 * - match_started: Match status changed to live
 * - score_updated: Match score was updated
 * - match_completed: Match was completed
 */

import { getIO, emitToTournament, emitToAll } from '../sockets/socket.io.js';
import Match from '../models/match.model.js';
import Tournament from '../models/tournament.model.js';

/**
 * Emit Tournament Live Event
 * 
 * Emits event when tournament status changes to live.
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {Object} tournamentData - Tournament data to send
 */
export const emitTournamentLive = async (tournamentId, tournamentData = null) => {
  try {
    // Fetch tournament data if not provided
    let data = tournamentData;
    if (!data) {
      const tournament = await Tournament.findById(tournamentId)
        .select('-createdBy')
        .lean();
      data = tournament;
    }

    emitToTournament(tournamentId, 'tournament_live', {
      tournamentId: tournamentId,
      tournament: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error emitting tournament_live event:', error);
  }
};

/**
 * Emit Match Started Event
 * 
 * Emits event when a match status changes to live.
 * 
 * @param {string} matchId - Match ID
 * @param {Object} matchData - Match data to send (optional)
 */
export const emitMatchStarted = async (matchId, matchData = null) => {
  try {
    // Fetch match data if not provided
    let data = matchData;
    if (!data) {
      data = await Match.findById(matchId)
        .populate('participantA', 'name players')
        .populate('participantB', 'name players')
        .populate('tournamentId', 'name format type')
        .lean();
    }

    if (data && data.tournamentId) {
      const tournamentId = data.tournamentId._id?.toString() || data.tournamentId.toString();
      
      emitToTournament(tournamentId, 'match_started', {
        matchId: matchId,
        match: data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error emitting match_started event:', error);
  }
};

/**
 * Emit Score Updated Event
 * 
 * Emits event when match score is updated.
 * 
 * @param {string} matchId - Match ID
 * @param {Object} matchData - Match data to send (optional)
 */
export const emitScoreUpdated = async (matchId, matchData = null) => {
  try {
    // Fetch match data if not provided
    let data = matchData;
    if (!data) {
      data = await Match.findById(matchId)
        .populate('participantA', 'name players')
        .populate('participantB', 'name players')
        .populate('tournamentId', 'name format type')
        .lean();
    }

    if (data && data.tournamentId) {
      const tournamentId = data.tournamentId._id?.toString() || data.tournamentId.toString();
      
      emitToTournament(tournamentId, 'score_updated', {
        matchId: matchId,
        match: data,
        score: {
          a: data.score?.a || 0,
          b: data.score?.b || 0
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error emitting score_updated event:', error);
  }
};

/**
 * Emit Match Completed Event
 * 
 * Emits event when a match is completed.
 * 
 * @param {string} matchId - Match ID
 * @param {Object} matchData - Match data to send (optional)
 * @param {Object} winnerData - Winner participant data (optional)
 * @param {Object} progressionData - Tournament progression data (optional)
 */
export const emitMatchCompleted = async (matchId, matchData = null, winnerData = null, progressionData = null) => {
  try {
    // Fetch match data if not provided
    let data = matchData;
    if (!data) {
      data = await Match.findById(matchId)
        .populate('participantA', 'name players')
        .populate('participantB', 'name players')
        .populate('tournamentId', 'name format type status currentRound')
        .lean();
    }

    if (data && data.tournamentId) {
      const tournamentId = data.tournamentId._id?.toString() || data.tournamentId.toString();
      
      emitToTournament(tournamentId, 'match_completed', {
        matchId: matchId,
        match: data,
        winner: winnerData,
        progression: progressionData,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error emitting match_completed event:', error);
  }
};

