/**
 * Group Standings Controller
 * 
 * Handles group-wise standings calculation and display
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';
import Match from '../models/match.model.js';

/**
 * Get Group Standings
 * 
 * Returns standings for each group separately
 */
export const getGroupStandings = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view standings for this tournament'
      });
    }

    // Get all participants
    const participants = await Participant.find({ tournamentId: id }).lean();

    // Get all group stage matches
    const groupMatches = await Match.find({
      tournamentId: id,
      round: { $regex: /^Group / }
    })
      .populate('participantA', 'name players')
      .populate('participantB', 'name players')
      .lean();

    // Get completed group matches
    const completedGroupMatches = groupMatches.filter(m => 
      m.status === 'completed' && m.participantA && m.participantB
    );

    // Calculate standings per group
    const groupStandings = calculateGroupStandings(participants, completedGroupMatches);

    res.status(200).json({
      success: true,
      data: {
        tournament: {
          id: tournament._id,
          name: tournament.name
        },
        groupStandings,
        summary: {
          totalGroups: groupStandings.length,
          totalParticipants: participants.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching group standings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group standings',
      error: error.message
    });
  }
};

/**
 * Calculate Group Standings
 * 
 * Calculates standings for each group separately
 */
function calculateGroupStandings(participants, completedMatches) {
  const groupStandingsMap = new Map();

  // Initialize standings for each group
  completedMatches.forEach(match => {
    const groupName = match.round.replace('Group ', ''); // Extract group letter (A, B, C, D...)
    if (!groupStandingsMap.has(groupName)) {
      groupStandingsMap.set(groupName, {
        groupName,
        participants: new Map()
      });
    }
  });

  // Process matches for each group
  completedMatches.forEach(match => {
    const groupName = match.round.replace('Group ', '');
    const groupData = groupStandingsMap.get(groupName);
    
    if (!match.participantA || !match.participantB) return;

    const pAId = match.participantA._id.toString();
    const pBId = match.participantB._id.toString();

    // Initialize participants if not exists
    if (!groupData.participants.has(pAId)) {
      const participant = participants.find(p => p._id.toString() === pAId);
      if (participant) {
        groupData.participants.set(pAId, {
          participant: {
            id: participant._id,
            name: participant.name,
            players: participant.players
          },
          stats: {
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDifference: 0
          }
        });
      }
    }
    if (!groupData.participants.has(pBId)) {
      const participant = participants.find(p => p._id.toString() === pBId);
      if (participant) {
        groupData.participants.set(pBId, {
          participant: {
            id: participant._id,
            name: participant.name,
            players: participant.players
          },
          stats: {
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDifference: 0
          }
        });
      }
    }

    const standingA = groupData.participants.get(pAId);
    const standingB = groupData.participants.get(pBId);

    if (!standingA || !standingB) return;

    standingA.stats.matchesPlayed++;
    standingB.stats.matchesPlayed++;

    standingA.stats.pointsFor += match.score.a || 0;
    standingA.stats.pointsAgainst += match.score.b || 0;
    standingB.stats.pointsFor += match.score.b || 0;
    standingB.stats.pointsAgainst += match.score.a || 0;

    if (match.score.a > match.score.b) {
      standingA.stats.wins++;
      standingB.stats.losses++;
    } else if (match.score.b > match.score.a) {
      standingB.stats.wins++;
      standingA.stats.losses++;
    }

    standingA.stats.pointDifference = standingA.stats.pointsFor - standingA.stats.pointsAgainst;
    standingB.stats.pointDifference = standingB.stats.pointsFor - standingB.stats.pointsAgainst;
  });

  // Convert to array and sort each group
  const groupStandings = [];
  groupStandingsMap.forEach((groupData, groupName) => {
    const standings = Array.from(groupData.participants.values());
    // Sort by wins (desc), then point difference (desc)
    standings.sort((a, b) => {
      if (b.stats.wins !== a.stats.wins) {
        return b.stats.wins - a.stats.wins;
      }
      return b.stats.pointDifference - a.stats.pointDifference;
    });
    
    standings.forEach((standing, index) => {
      standing.position = index + 1;
      standing.group = groupName;
    });
    
    groupStandings.push({
      groupName,
      standings
    });
  });

  // Sort groups alphabetically
  groupStandings.sort((a, b) => a.groupName.localeCompare(b.groupName));

  return groupStandings;
}

