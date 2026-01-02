/**
 * Group Tournament Controller
 * 
 * Handles group-based tournament fixture generation with:
 * - Group distribution
 * - Group stage matches (Round Robin or Knockout)
 * - Knockout rounds with same-group avoidance
 * - Standings calculation per group
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';
import Match from '../models/match.model.js';

/**
 * Generate Group Tournament
 * 
 * Creates a complete group-based tournament structure:
 * 1. Distributes participants into groups
 * 2. Generates group stage matches (Round Robin or Knockout)
 * 3. Generates knockout rounds (Quarterfinal, Semifinal, Final)
 * 4. Ensures teams from same group don't play in quarters
 */
export const generateGroupTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numGroups,
      minPlayersPerGroup,
      maxPlayersPerGroup,
      tournamentStructure, // 'quarterfinal', 'semifinal', 'directFinal'
      topPlayersPerGroup,
      stage1Format // 'roundRobin', 'knockout'
    } = req.body;

    // Validate tournament ID
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

    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to generate fixtures for this tournament'
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
    const participants = await Participant.find({ tournamentId: id }).lean();
    if (participants.length < numGroups) {
      return res.status(400).json({
        success: false,
        message: `Need at least ${numGroups} participants for ${numGroups} groups`
      });
    }

    // Check for existing matches
    const existingMatches = await Match.countDocuments({ tournamentId: id });
    if (existingMatches > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tournament already has matches. Delete existing matches first.'
      });
    }

    // Calculate group distribution
    const groupDistribution = calculateGroupDistribution(participants.length, numGroups);
    
    // Validate distribution
    const minSize = Math.min(...groupDistribution);
    const maxSize = Math.max(...groupDistribution);
    if (minSize < minPlayersPerGroup || maxSize > maxPlayersPerGroup) {
      return res.status(400).json({
        success: false,
        message: `Group distribution (${groupDistribution.join(', ')}) doesn't meet min/max requirements`
      });
    }

    // Validate tournament structure
    const totalQualified = topPlayersPerGroup * numGroups;
    if (tournamentStructure === 'semifinal' && totalQualified !== 4) {
      return res.status(400).json({
        success: false,
        message: 'For semifinal, total qualified players must be exactly 4'
      });
    }
    if (tournamentStructure === 'directFinal' && totalQualified !== 2) {
      return res.status(400).json({
        success: false,
        message: 'For direct final, total qualified players must be exactly 2'
      });
    }

    // Shuffle participants randomly
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);

    // Distribute participants into groups
    const groups = distributeParticipants(shuffledParticipants, groupDistribution);

    // Generate group stage matches
    const groupStageMatches = await generateGroupStageMatches(
      id,
      groups,
      stage1Format,
      tournament
    );

    // Generate knockout rounds upfront with TBD participants
    // They will be auto-filled when group stage completes
    const knockoutMatches = await generateKnockoutRoundsUpfront(
      id,
      tournamentStructure,
      topPlayersPerGroup,
      numGroups
    );

    // Update tournament currentRound
    tournament.currentRound = 'Group Stage';
    
    // Store tournament metadata for later use (MongoDB allows custom fields)
    tournament.topPlayersPerGroup = topPlayersPerGroup;
    tournament.tournamentStructure = tournamentStructure;
    tournament.numGroups = numGroups;
    
    await tournament.save();

    res.status(201).json({
      success: true,
      message: 'Group tournament fixtures generated successfully',
      data: {
        tournament: {
          id: tournament._id,
          name: tournament.name,
          format: tournament.format
        },
        groups: groups.map((g, idx) => ({
          groupName: String.fromCharCode(65 + idx), // A, B, C, D...
          participants: g.map(p => ({ id: p._id, name: p.name, players: p.players })),
          count: g.length
        })),
        groupDistribution,
        groupStageMatches: groupStageMatches.length,
        tournamentStructure,
        topPlayersPerGroup,
        totalQualified
      }
    });
  } catch (error) {
    console.error('Error generating group tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating group tournament',
      error: error.message
    });
  }
};

/**
 * Calculate Group Distribution
 * 
 * Distributes players as evenly as possible across groups
 */
function calculateGroupDistribution(totalPlayers, numGroups) {
  const baseSize = Math.floor(totalPlayers / numGroups);
  const remainder = totalPlayers % numGroups;
  
  const distribution = [];
  for (let i = 0; i < numGroups; i++) {
    distribution.push(baseSize + (i < remainder ? 1 : 0));
  }
  
  return distribution;
}

/**
 * Distribute Participants into Groups
 */
function distributeParticipants(participants, distribution) {
  const groups = [];
  let index = 0;
  
  for (let i = 0; i < distribution.length; i++) {
    const groupSize = distribution[i];
    groups.push(participants.slice(index, index + groupSize));
    index += groupSize;
  }
  
  return groups;
}

/**
 * Generate Group Stage Matches
 * 
 * Creates matches for each group based on format (Round Robin or Knockout)
 */
async function generateGroupStageMatches(tournamentId, groups, format, tournament) {
  const allMatches = [];
  let matchOrder = 0;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const groupName = String.fromCharCode(65 + groupIndex); // A, B, C, D...
    const roundName = `Group ${groupName}`;

    if (format === 'roundRobin') {
      // Round Robin: Each team plays every other team once
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          // Ensure participants are different (prevent A vs A)
          if (group[i]._id.toString() !== group[j]._id.toString()) {
            allMatches.push({
              tournamentId,
              round: roundName,
              participantA: group[i]._id,
              participantB: group[j]._id,
              score: { a: 0, b: 0 },
              status: 'upcoming',
              order: matchOrder++,
              courtNumber: null,
              groupName: groupName
            });
          }
        }
      }
    } else if (format === 'knockout') {
      // Knockout: Create bracket within group
      const matches = createKnockoutBracket(group);
      matches.forEach(match => {
        allMatches.push({
          tournamentId,
          round: roundName,
          participantA: match.participantA || null, // Can be null for TBD
          participantB: match.participantB || null, // Can be null for TBD
          score: { a: 0, b: 0 },
          status: 'upcoming',
          order: matchOrder++,
          courtNumber: null,
          groupName: groupName
        });
      });
    }
  }

  // Insert all matches
  if (allMatches.length > 0) {
    await Match.insertMany(allMatches);
  }

  return allMatches;
}

/**
 * Create Knockout Bracket for a Group
 * 
 * Creates matches for knockout format within a group
 * Ensures no same team plays against itself
 */
function createKnockoutBracket(participants) {
  const matches = [];
  const hasOddNumber = participants.length % 2 !== 0;

  // Shuffle to avoid predictable pairings
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Only create first round matches with actual participants
  // Don't create subsequent rounds (they'll be created after matches complete)
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const pA = shuffled[i]._id;
    const pB = shuffled[i + 1]._id;
    
    // Ensure participants are different (should always be, but double-check)
    if (pA.toString() !== pB.toString()) {
      matches.push({
        participantA: pA,
        participantB: pB,
        roundNumber: 1
      });
    }
  }

  // If odd number, last participant gets bye (no match needed, they advance automatically)
  // But we need to create a match with TBD for the last participant
  if (hasOddNumber) {
    matches.push({
      participantA: shuffled[shuffled.length - 1]._id,
      participantB: null, // TBD - will be filled if needed
      roundNumber: 1
    });
  }

  return matches;
}

/**
 * Generate Knockout Rounds Upfront
 * 
 * Creates all knockout rounds (Quarterfinal, Semifinal, Final) with TBD participants
 * They will be auto-filled when previous rounds complete
 */
async function generateKnockoutRoundsUpfront(tournamentId, tournamentStructure, topPlayersPerGroup, numGroups) {
  const matches = [];
  const totalQualified = topPlayersPerGroup * numGroups;
  let matchOrder = 1000; // Start from high number to avoid conflicts with group matches

  // Generate Quarterfinal matches (if tournament structure includes it)
  if (tournamentStructure === 'quarterfinal') {
    // Quarterfinal: 8 teams -> 4 matches
    for (let i = 0; i < 4; i++) {
      matches.push({
        tournamentId,
        round: 'Quarterfinal',
        participantA: null, // TBD - will be filled from group standings
        participantB: null, // TBD - will be filled from group standings
        score: { a: 0, b: 0 },
        status: 'upcoming',
        order: matchOrder++,
        courtNumber: null
      });
    }
  }

  // Generate Semifinal matches (always if quarterfinal or direct semifinal)
  if (tournamentStructure === 'quarterfinal' || tournamentStructure === 'semifinal') {
    // Semifinal: 4 teams -> 2 matches
    for (let i = 0; i < 2; i++) {
      matches.push({
        tournamentId,
        round: 'Semifinal',
        participantA: null, // TBD - will be filled from quarterfinal winners or group standings
        participantB: null, // TBD - will be filled from quarterfinal winners or group standings
        score: { a: 0, b: 0 },
        status: 'upcoming',
        order: matchOrder++,
        courtNumber: null
      });
    }
  }

  // Generate Final match (always)
  matches.push({
    tournamentId,
    round: 'Final',
    participantA: null, // TBD - will be filled from semifinal winners or group standings
    participantB: null, // TBD - will be filled from semifinal winners or group standings
    score: { a: 0, b: 0 },
    status: 'upcoming',
    order: matchOrder++,
    courtNumber: null
  });

  // Insert all knockout matches
  if (matches.length > 0) {
    await Match.insertMany(matches);
  }

  return matches;
}

