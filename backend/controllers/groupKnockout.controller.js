/**
 * Group Knockout Controller
 * 
 * Handles generation of knockout rounds after group stage completion.
 * Ensures teams from same group don't play each other in quarterfinals.
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';
import Match from '../models/match.model.js';
import { calculateStandings, sortStandings } from '../services/standings.service.js';

/**
 * Generate Knockout Rounds
 * 
 * Generates quarterfinal, semifinal, and final matches based on:
 * - Group stage standings
 * - Top players from each group
 * - Same-group avoidance rule for quarterfinals
 */
export const generateKnockoutRounds = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tournamentStructure, // 'quarterfinal', 'semifinal', 'directFinal'
      topPlayersPerGroup
    } = req.body;

    // Validate tournament ID
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
        message: 'You do not have permission to generate knockout rounds for this tournament'
      });
    }

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

    if (completedGroupMatches.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No completed group stage matches found. Complete group stage matches first.'
      });
    }

    // Get all participants
    const participants = await Participant.find({ tournamentId: id }).lean();

    // Calculate standings per group
    const groupStandings = calculateGroupStandings(participants, completedGroupMatches);

    // Get top players from each group
    const qualifiedPlayers = getTopPlayersFromGroups(groupStandings, topPlayersPerGroup);

    // Validate qualified players count
    const totalQualified = qualifiedPlayers.length;
    if (tournamentStructure === 'semifinal' && totalQualified !== 4) {
      return res.status(400).json({
        success: false,
        message: `Expected 4 qualified players for semifinal, got ${totalQualified}`
      });
    }
    if (tournamentStructure === 'directFinal' && totalQualified !== 2) {
      return res.status(400).json({
        success: false,
        message: `Expected 2 qualified players for direct final, got ${totalQualified}`
      });
    }

    // Check if knockout rounds already exist (with actual participants, not just TBD)
    const existingKnockout = await Match.find({
      tournamentId: id,
      round: { $in: ['Quarterfinal', 'Semifinal', 'Final'] },
      $or: [
        { participantA: { $ne: null } },
        { participantB: { $ne: null } }
      ]
    });

    if (existingKnockout.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Knockout rounds already have participants assigned. Delete them first to regenerate.'
      });
    }

    // Delete existing TBD-only knockout matches to regenerate with proper participants
    await Match.deleteMany({
      tournamentId: id,
      round: { $in: ['Quarterfinal', 'Semifinal', 'Final'] },
      participantA: null,
      participantB: null
    });

    // Generate knockout matches
    const knockoutMatches = [];

    if (tournamentStructure === 'quarterfinal') {
      // Generate quarterfinal matches with same-group avoidance
      const quarterfinalMatches = generateQuarterfinals(qualifiedPlayers);
      quarterfinalMatches.forEach((match, index) => {
        knockoutMatches.push({
          tournamentId: id,
          round: 'Quarterfinal',
          participantA: match.participantA,
          participantB: match.participantB,
          score: { a: 0, b: 0 },
          status: 'upcoming',
          order: index,
          courtNumber: null
        });
      });
    }

    if (tournamentStructure === 'semifinal' || tournamentStructure === 'quarterfinal') {
      // Generate semifinal matches (top 4)
      // If quarterfinal, these will be filled after quarters complete
      // If direct semifinal, use qualified players
      const semifinalParticipants = tournamentStructure === 'quarterfinal' 
        ? [null, null, null, null] // Placeholders (TBD) for quarterfinal winners
        : qualifiedPlayers.map(p => p.participant.id);

      const semifinalMatches = generateSemifinals(semifinalParticipants);
      semifinalMatches.forEach((match, index) => {
        knockoutMatches.push({
          tournamentId: id,
          round: 'Semifinal',
          participantA: match.participantA || null, // TBD if null
          participantB: match.participantB || null, // TBD if null
          score: { a: 0, b: 0 },
          status: 'upcoming',
          order: index,
          courtNumber: null
        });
      });
    }

    // Generate final (always top 2)
    const finalParticipants = tournamentStructure === 'directFinal'
      ? qualifiedPlayers.map(p => p.participant.id)
      : [null, null]; // Placeholders (TBD) for semifinal winners

    knockoutMatches.push({
      tournamentId: id,
      round: 'Final',
      participantA: finalParticipants[0] || null, // TBD if null
      participantB: finalParticipants[1] || null, // TBD if null
      score: { a: 0, b: 0 },
      status: 'upcoming',
      order: 0,
      courtNumber: null
    });

    // Insert knockout matches
    await Match.insertMany(knockoutMatches);

    // Update tournament currentRound
    if (tournamentStructure === 'quarterfinal') {
      tournament.currentRound = 'Quarterfinal';
    } else if (tournamentStructure === 'semifinal') {
      tournament.currentRound = 'Semifinal';
    } else {
      tournament.currentRound = 'Final';
    }
    await tournament.save();

    res.status(201).json({
      success: true,
      message: 'Knockout rounds generated successfully',
      data: {
        qualifiedPlayers: qualifiedPlayers.map(q => ({
          participant: q.participant,
          group: q.group,
          position: q.position
        })),
        knockoutMatches: knockoutMatches.length,
        tournamentStructure
      }
    });
  } catch (error) {
    console.error('Error generating knockout rounds:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating knockout rounds',
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
    const groupName = match.round.replace('Group ', ''); // Extract group letter
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
    
    groupStandings.push(...standings);
  });

  return groupStandings;
}

/**
 * Get Top Players from Each Group
 * 
 * Returns top N players from each group based on standings
 */
function getTopPlayersFromGroups(groupStandings, topPlayersPerGroup) {
  const qualified = [];
  const groupsMap = new Map();

  // Group standings by group name
  groupStandings.forEach(standing => {
    if (!groupsMap.has(standing.group)) {
      groupsMap.set(standing.group, []);
    }
    groupsMap.get(standing.group).push(standing);
  });

  // Get top N from each group
  groupsMap.forEach((standings, groupName) => {
    const topN = standings.slice(0, topPlayersPerGroup);
    topN.forEach(standing => {
      qualified.push({
        participant: standing.participant,
        group: groupName,
        position: standing.position,
        stats: standing.stats
      });
    });
  });

  return qualified;
}

/**
 * Generate Quarterfinal Matches
 * 
 * Creates quarterfinal matches ensuring teams from same group don't play
 * Example: A1, A2, B1, B2, C1, C2, D1, D2
 * Matches: A1 vs D2, A2 vs D1, B1 vs C2, B2 vs C1
 */
function generateQuarterfinals(qualifiedPlayers) {
  // Group qualified players by their group
  const playersByGroup = new Map();
  qualifiedPlayers.forEach(qp => {
    if (!playersByGroup.has(qp.group)) {
      playersByGroup.set(qp.group, []);
    }
    playersByGroup.get(qp.group).push(qp);
  });

  const groups = Array.from(playersByGroup.keys());
  const matches = [];

  // Strategy: Pair groups that are far apart
  // For 4 groups with 2 players each: A, B, C, D
  // Match: A1 vs D2, A2 vs D1, B1 vs C2, B2 vs C1
  if (groups.length === 4 && qualifiedPlayers.length === 8) {
    const [groupA, groupB, groupC, groupD] = groups;
    const playersA = playersByGroup.get(groupA);
    const playersB = playersByGroup.get(groupB);
    const playersC = playersByGroup.get(groupC);
    const playersD = playersByGroup.get(groupD);

    // A vs D
    matches.push({
      participantA: playersA[0].participant.id,
      participantB: playersD[1].participant.id
    });
    matches.push({
      participantA: playersA[1].participant.id,
      participantB: playersD[0].participant.id
    });

    // B vs C
    matches.push({
      participantA: playersB[0].participant.id,
      participantB: playersC[1].participant.id
    });
    matches.push({
      participantA: playersB[1].participant.id,
      participantB: playersC[0].participant.id
    });
  } else {
    // Generic algorithm for other configurations
    const allPlayers = [...qualifiedPlayers];
    const used = new Set();

    for (let i = 0; i < allPlayers.length; i += 2) {
      if (i + 1 < allPlayers.length) {
        const player1 = allPlayers[i];
        const player2 = allPlayers[i + 1];

        // Ensure they're from different groups
        if (player1.group !== player2.group) {
          matches.push({
            participantA: player1.participant.id,
            participantB: player2.participant.id
          });
          used.add(i);
          used.add(i + 1);
        }
      }
    }

    // Handle remaining players
    const remaining = allPlayers.filter((_, idx) => !used.has(idx));
    // Try to pair remaining with different groups
    for (let i = 0; i < remaining.length; i += 2) {
      if (i + 1 < remaining.length && remaining[i].group !== remaining[i + 1].group) {
        matches.push({
          participantA: remaining[i].participant.id,
          participantB: remaining[i + 1].participant.id
        });
      }
    }
  }

  return matches;
}

/**
 * Generate Semifinal Matches
 * 
 * Creates semifinal matches (always top 4)
 */
function generateSemifinals(participants) {
  // Semifinal: 4 participants -> 2 matches
  const matches = [];
  
  if (participants.length === 4) {
    matches.push({
      participantA: participants[0],
      participantB: participants[1]
    });
    matches.push({
      participantA: participants[2],
      participantB: participants[3]
    });
  }

  return matches;
}

