/**
 * Tournament Progression Service
 * 
 * This service handles tournament progression logic:
 * - Determining match winners
 * - Checking if rounds are complete
 * - Generating next round matches (for knockout tournaments)
 * - Advancing winners to next rounds
 * - Locking completed rounds
 */

import Match from '../models/match.model.js';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';

/**
 * Get Match Winner
 * 
 * Determines the winner of a completed match based on scores.
 * 
 * @param {Object} match - Match object with score and status
 * @returns {Object|null} Winner participant ID or null if draw/not completed
 */
export const getMatchWinner = (match) => {
  if (match.status !== 'completed') {
    return null;
  }

  if (match.score.a > match.score.b) {
    return match.participantA;
  } else if (match.score.b > match.score.a) {
    return match.participantB;
  }

  // Draw - in knockout tournaments, this might need special handling
  // For now, return null (draws should be prevented by business rules)
  return null;
};

/**
 * Check if Round is Complete
 * 
 * Checks if all matches in a specific round are completed.
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {string} round - Round name (e.g., "Quarter Finals")
 * @returns {Promise<boolean>} True if all matches in round are completed
 */
export const isRoundComplete = async (tournamentId, round) => {
  const matches = await Match.find({
    tournamentId: tournamentId,
    round: round
  });

  if (matches.length === 0) {
    return false; // No matches in this round
  }

  // Check if all matches are completed
  return matches.every(match => match.status === 'completed');
};

/**
 * Get Round Winners
 * 
 * Gets all winners from a completed round.
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {string} round - Round name
 * @returns {Promise<Array>} Array of winner participant IDs
 */
export const getRoundWinners = async (tournamentId, round) => {
  const matches = await Match.find({
    tournamentId: tournamentId,
    round: round,
    status: 'completed'
  });

  const winners = [];
  matches.forEach(match => {
    const winner = getMatchWinner(match);
    if (winner) {
      winners.push(winner);
    }
  });

  return winners;
};

/**
 * Get Next Round Name
 * 
 * Determines the next round name based on current round.
 * Used for knockout tournament progression.
 * 
 * Round progression:
 * - Round of 16 -> Quarter Finals
 * - Quarter Finals -> Semi Finals
 * - Semi Finals -> Final
 * - Final -> (tournament complete)
 * 
 * @param {string} currentRound - Current round name
 * @returns {string|null} Next round name or null if tournament is complete
 */
export const getNextRoundName = (currentRound) => {
  const roundProgression = {
    'Round of 32': 'Round of 16',
    'Round of 16': 'Quarter Finals',
    'Quarter Finals': 'Semi Finals',
    'Semi Finals': 'Final',
    'Quarterfinal': 'Semifinal',
    'Semifinal': 'Final',
    'Final': null // Tournament complete
  };

  // Handle group rounds (e.g., "Group A")
  if (currentRound.startsWith('Group ')) {
    // For group stages, next round is knockout stage (Quarterfinal, Semifinal, or Final)
    // This is determined by tournament structure, not automatic
    return null; // Groups don't have automatic progression to knockout
  }

  // Handle numbered rounds (e.g., "Round 1", "Round 2")
  if (currentRound.match(/^Round \d+$/)) {
    const roundNum = parseInt(currentRound.match(/\d+/)[0]);
    return `Round ${roundNum + 1}`;
  }

  return roundProgression[currentRound] || null;
};

/**
 * Generate Next Round Matches (Knockout)
 * 
 * Generates matches for the next round in a knockout tournament.
 * Pairs winners from the previous round.
 * 
 * Algorithm:
 * 1. Get all winners from completed round
 * 2. Pair them up (first with second, third with fourth, etc.)
 * 3. Handle odd counts with byes (if needed)
 * 4. Create matches for next round
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {string} completedRound - Name of the completed round
 * @param {string} nextRound - Name of the next round
 * @returns {Promise<Array>} Array of created match objects
 */
export const generateNextRoundMatches = async (tournamentId, completedRound, nextRound) => {
  // Get winners from completed round
  const winners = await getRoundWinners(tournamentId, completedRound);

  if (winners.length === 0) {
    throw new Error('No winners found in completed round');
  }

  // Get current max order to continue numbering
  const maxOrder = await Match.findOne({ tournamentId: tournamentId })
    .sort({ order: -1 })
    .select('order')
    .lean();

  let nextOrder = maxOrder ? maxOrder.order + 1 : 0;
  const matches = [];

  // Pair winners for next round
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      // Both participants available - create match
      matches.push({
        tournamentId: tournamentId,
        round: nextRound,
        participantA: winners[i],
        participantB: winners[i + 1],
        score: { a: 0, b: 0 },
        status: 'upcoming',
        order: nextOrder++,
        courtNumber: null
      });
    } else {
      // Odd number - this participant gets a bye
      // In knockout, byes are rare in later rounds, but we handle it
      // For now, we'll create a match with only participantA
      // In a full implementation, you might want to handle byes differently
      // For simplicity, we'll skip creating a match for the bye
      // The participant will need to be manually advanced
    }
  }

  // Insert matches into database
  if (matches.length > 0) {
    const createdMatches = await Match.insertMany(matches);
    return createdMatches;
  }

  return [];
};

/**
 * Update Tournament Current Round
 * 
 * Updates the tournament's currentRound field based on match status.
 * 
 * Logic:
 * - If a round is complete, move to next round
 * - For knockout: automatically progress to next round
 * - For group/roundRobin: update based on active matches
 * 
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<string|null>} Updated current round name or null
 */
export const updateTournamentCurrentRound = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Get all matches for this tournament
  const allMatches = await Match.find({ tournamentId: tournamentId })
    .sort({ order: 1 })
    .lean();

  if (allMatches.length === 0) {
    return null;
  }

  // For knockout tournaments, find the earliest incomplete round
  if (tournament.format === 'knockout') {
    const rounds = ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
    
    for (const round of rounds) {
      const roundMatches = allMatches.filter(m => m.round === round);
      if (roundMatches.length > 0) {
        const isComplete = roundMatches.every(m => m.status === 'completed');
        if (!isComplete) {
          tournament.currentRound = round;
          await tournament.save();
          return round;
        }
      }
    }

    // All rounds complete
    tournament.currentRound = 'Completed';
    await tournament.save();
    return 'Completed';
  }

  // For group and roundRobin, find the round with most upcoming/live matches
  const roundStatus = {};
  allMatches.forEach(match => {
    if (!roundStatus[match.round]) {
      roundStatus[match.round] = {
        upcoming: 0,
        live: 0,
        completed: 0
      };
    }
    roundStatus[match.round][match.status]++;
  });

  // Find round with most upcoming or live matches
  let currentRound = tournament.currentRound;
  let maxActive = 0;

  Object.keys(roundStatus).forEach(round => {
    const active = roundStatus[round].upcoming + roundStatus[round].live;
    if (active > maxActive) {
      maxActive = active;
      currentRound = round;
    }
  });

  if (currentRound !== tournament.currentRound) {
    tournament.currentRound = currentRound;
    await tournament.save();
  }

  return currentRound;
};

/**
 * Check if Round is Locked
 * 
 * A round is locked if it's completed and we're in a knockout tournament.
 * Locked rounds cannot have their matches edited.
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {string} round - Round name
 * @returns {Promise<boolean>} True if round is locked
 */
export const isRoundLocked = async (tournamentId, round) => {
  const tournament = await Tournament.findById(tournamentId).lean();

  if (!tournament) {
    return false;
  }

  // Only knockout tournaments have locked rounds
  if (tournament.format !== 'knockout') {
    return false;
  }

  // Check if round is complete
  const isComplete = await isRoundComplete(tournamentId, round);

  // If round is complete and there are matches in later rounds, it's locked
  if (isComplete) {
    const nextRound = getNextRoundName(round);
    if (nextRound) {
      const nextRoundMatches = await Match.countDocuments({
        tournamentId: tournamentId,
        round: nextRound
      });
      if (nextRoundMatches > 0) {
        return true; // Round is complete and next round exists - locked
      }
    }
  }

  return false;
};

/**
 * Process Match Completion
 * 
 * Main function to handle match completion and tournament progression.
 * 
 * Steps:
 * 1. Verify match is completed
 * 2. Check if round is complete
 * 3. If knockout and round complete, generate next round
 * 4. Update tournament currentRound
 * 5. Check if tournament is complete
 * 
 * @param {string} matchId - Match ID that was just completed
 * @returns {Promise<Object>} Object with progression information
 */
export const processMatchCompletion = async (matchId) => {
  const match = await Match.findById(matchId).populate('tournamentId');

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'completed') {
    throw new Error('Match is not completed');
  }

  const tournament = match.tournamentId;
  const progression = {
    matchCompleted: true,
    roundComplete: false,
    nextRoundGenerated: false,
    tournamentComplete: false,
    updatedRounds: []
  };

  // Check if current round is complete
  const roundComplete = await isRoundComplete(tournament._id, match.round);
  progression.roundComplete = roundComplete;

  // Handle group stage completion - check if ALL group stage matches are complete
  if (roundComplete && match.round.startsWith('Group ')) {
      // Check if ALL group stage matches are complete
      const allGroupMatches = await Match.find({
        tournamentId: tournament._id,
        round: { $regex: /^Group / }
      })
      .populate('participantA', '_id name')
      .populate('participantB', '_id name')
      .lean();
    
    const allGroupMatchesComplete = allGroupMatches.every(m => m.status === 'completed');
    
    if (allGroupMatchesComplete) {
      // All group stage matches are complete - now fill knockout rounds
      // Get tournament metadata to determine topPlayersPerGroup and tournamentStructure
      // We'll need to get this from tournament metadata or calculate from existing knockout matches
      
      // Check if knockout rounds exist with TBD participants
      const knockoutRounds = ['Quarterfinal', 'Semifinal', 'Final'];
      const knockoutMatches = await Match.find({
        tournamentId: tournament._id,
        round: { $in: knockoutRounds }
      }).sort({ round: 1, order: 1 });
      
      if (knockoutMatches.length > 0) {
        // Check if any knockout matches have TBD participants
        const hasTBDMatches = knockoutMatches.some(m => !m.participantA || !m.participantB);
        
        if (hasTBDMatches) {
          // Calculate group standings and get qualified players
          const participants = await Participant.find({ tournamentId: tournament._id }).lean();
          const completedGroupMatches = allGroupMatches.filter(m => 
            m.status === 'completed' && m.participantA && m.participantB
          );
          
          // Calculate standings per group
          const groupStandings = await calculateGroupStandingsForProgression(participants, completedGroupMatches);
          
          // Get topPlayersPerGroup from tournament metadata (stored during fixture generation)
          let topPlayersPerGroup = tournament.topPlayersPerGroup;
          
          // If not stored, calculate from knockout match structure
          if (!topPlayersPerGroup || topPlayersPerGroup < 1) {
            const quarterfinalMatches = knockoutMatches.filter(m => m.round === 'Quarterfinal');
            const semifinalMatches = knockoutMatches.filter(m => m.round === 'Semifinal');
            const finalMatches = knockoutMatches.filter(m => m.round === 'Final');
            
            // Get unique groups from group matches
            const uniqueGroups = new Set(allGroupMatches.map(m => m.round.replace('Group ', '')));
            const numGroups = uniqueGroups.size;
            
            // Calculate total qualified players needed based on knockout structure
            let totalQualifiedNeeded = 0;
            if (quarterfinalMatches.length > 0) {
              // Quarterfinal exists - need 8 players (4 matches * 2 players each)
              totalQualifiedNeeded = quarterfinalMatches.length * 2;
            } else if (semifinalMatches.length > 0) {
              // Only semifinal - need 4 players (2 matches * 2 players each)
              totalQualifiedNeeded = semifinalMatches.length * 2;
            } else if (finalMatches.length > 0) {
              // Only final - need 2 players (1 match * 2 players)
              totalQualifiedNeeded = finalMatches.length * 2;
            }
            
            // Calculate topPlayersPerGroup: total qualified / number of groups
            topPlayersPerGroup = numGroups > 0 ? Math.floor(totalQualifiedNeeded / numGroups) : 2;
            
            // Validate: topPlayersPerGroup should be at least 1 and reasonable
            if (topPlayersPerGroup < 1) {
              topPlayersPerGroup = 1; // Minimum 1 player per group
            }
            if (topPlayersPerGroup > 10) {
              // If calculation seems wrong, try to infer from TBD slots
              const totalTBDNeeded = knockoutMatches.filter(m => 
                !m.participantA || !m.participantB
              ).reduce((sum, m) => {
                return sum + (m.participantA === null ? 1 : 0) + (m.participantB === null ? 1 : 0);
              }, 0);
              
              if (totalTBDNeeded > 0 && numGroups > 0) {
                topPlayersPerGroup = Math.floor(totalTBDNeeded / numGroups);
              } else {
                topPlayersPerGroup = 2; // Default fallback
              }
            }
          }
          
          // Get top players from each group
          const qualifiedPlayers = getTopPlayersFromGroupsForProgression(groupStandings, topPlayersPerGroup);
          
          // Fill knockout matches with qualified players
          await fillKnockoutRoundsWithQualifiedPlayers(knockoutMatches, qualifiedPlayers, tournament._id);
          
          progression.groupStageComplete = true;
          progression.knockoutRoundsFilled = true;
          progression.qualifiedPlayers = qualifiedPlayers.length;
          progression.updatedRounds.push(...knockoutRounds.filter(r => 
            knockoutMatches.some(m => m.round === r)
          ));
        }
      }
    }
  }

  // If round is complete and it's a knockout tournament, auto-fill TBD participants in next round
  // Skip group rounds as they're handled above
  if (roundComplete && (tournament.format === 'knockout' || tournament.format === 'custom') && !match.round.startsWith('Group ')) {
    const nextRound = getNextRoundName(match.round);

    if (nextRound) {
      // Get all winners from completed round
      const winners = await getRoundWinners(tournament._id, match.round);

      // Get next round matches (they should already exist with TBD/null participants)
      const nextRoundMatches = await Match.find({
        tournamentId: tournament._id,
        round: nextRound
      }).sort({ order: 1 });

      if (nextRoundMatches.length > 0) {
        // Auto-fill TBD participants with winners
        let winnerIndex = 0;
        
        for (const nextMatch of nextRoundMatches) {
          // Fill participantA if it's null (TBD)
          if (!nextMatch.participantA && winnerIndex < winners.length) {
            nextMatch.participantA = winners[winnerIndex++];
            await nextMatch.save();
          }
          
          // Fill participantB if it's null (TBD)
          if (!nextMatch.participantB && winnerIndex < winners.length) {
            nextMatch.participantB = winners[winnerIndex++];
            await nextMatch.save();
          }
        }

        progression.nextRoundFilled = true;
        progression.filledMatches = nextRoundMatches.length;
        progression.updatedRounds.push(nextRound);
      } else {
        // Next round matches don't exist - generate them
        const newMatches = await generateNextRoundMatches(
          tournament._id,
          match.round,
          nextRound
        );
        progression.nextRoundGenerated = true;
        progression.newMatches = newMatches.length;
        progression.updatedRounds.push(nextRound);
      }
    } else {
      // Check if this is a group stage completion - might need to generate knockout rounds
      if (match.round.startsWith('Group ')) {
        // Group stage complete - check if knockout rounds need to be generated
        const knockoutMatches = await Match.find({
          tournamentId: tournament._id,
          round: { $in: ['Quarterfinal', 'Semifinal', 'Final'] }
        });
        
        if (knockoutMatches.length === 0) {
          // Knockout rounds not yet generated - admin needs to generate them manually
          progression.groupStageComplete = true;
          progression.readyForKnockout = true;
        }
      } else {
        // No next round - tournament is complete
        progression.tournamentComplete = true;
        tournament.status = 'completed';
        tournament.currentRound = 'Completed';
        await tournament.save();
      }
    }
  }

  // Update tournament current round
  const updatedRound = await updateTournamentCurrentRound(tournament._id);
  if (updatedRound) {
    progression.updatedRounds.push(updatedRound);
  }

  return progression;
};

/**
 * Calculate Group Standings for Progression
 * 
 * Helper function to calculate standings per group
 */
async function calculateGroupStandingsForProgression(participants, completedMatches) {
  const groupStandingsMap = new Map();

  // Initialize standings for each group
  completedMatches.forEach(match => {
    const groupName = match.round.replace('Group ', '');
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

    // Handle both ObjectId and populated participant objects
    const pAId = match.participantA?._id 
      ? match.participantA._id.toString() 
      : (match.participantA?.toString ? match.participantA.toString() : null);
    const pBId = match.participantB?._id 
      ? match.participantB._id.toString() 
      : (match.participantB?.toString ? match.participantB.toString() : null);
    
    if (!pAId || !pBId) return;

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

  return groupStandings;
}

/**
 * Get Top Players from Groups for Progression
 * 
 * Returns top N players from each group
 */
function getTopPlayersFromGroupsForProgression(groupStandings, topPlayersPerGroup) {
  const qualified = [];

  groupStandings.forEach(group => {
    const topN = group.standings.slice(0, topPlayersPerGroup);
    topN.forEach(standing => {
      qualified.push({
        participantId: standing.participant.id,
        group: group.groupName,
        position: standing.position
      });
    });
  });

  return qualified;
}

/**
 * Fill Knockout Rounds with Qualified Players
 * 
 * Fills existing knockout matches (Quarterfinal, Semifinal, Final) with qualified players
 */
async function fillKnockoutRoundsWithQualifiedPlayers(knockoutMatches, qualifiedPlayers, tournamentId) {
  // Group matches by round
  const matchesByRound = {
    Quarterfinal: knockoutMatches.filter(m => m.round === 'Quarterfinal'),
    Semifinal: knockoutMatches.filter(m => m.round === 'Semifinal'),
    Final: knockoutMatches.filter(m => m.round === 'Final')
  };

  // Fill Quarterfinal matches first (if exists)
  if (matchesByRound.Quarterfinal.length > 0) {
    // Use same-group avoidance logic for quarterfinals
    const quarterfinalParticipants = qualifiedPlayers.map(qp => qp.participantId);
    
    // Group by group name
    const playersByGroup = new Map();
    qualifiedPlayers.forEach(qp => {
      if (!playersByGroup.has(qp.group)) {
        playersByGroup.set(qp.group, []);
      }
      playersByGroup.get(qp.group).push(qp);
    });

    const groups = Array.from(playersByGroup.keys()).sort();
    
    // For 4 groups with 2 players each: A1 vs D2, A2 vs D1, B1 vs C2, B2 vs C1
    if (groups.length === 4 && qualifiedPlayers.length === 8) {
      const [groupA, groupB, groupC, groupD] = groups;
      const playersA = playersByGroup.get(groupA);
      const playersB = playersByGroup.get(groupB);
      const playersC = playersByGroup.get(groupC);
      const playersD = playersByGroup.get(groupD);

      // Fill quarterfinal matches with cross-group pairing
      if (matchesByRound.Quarterfinal.length >= 4) {
        // Ensure no same team matches
        if (playersA[0] && playersD[1] && playersA[0].participantId.toString() !== playersD[1].participantId.toString()) {
          matchesByRound.Quarterfinal[0].participantA = playersA[0].participantId;
          matchesByRound.Quarterfinal[0].participantB = playersD[1].participantId;
          await matchesByRound.Quarterfinal[0].save();
        }

        if (playersA[1] && playersD[0] && playersA[1].participantId.toString() !== playersD[0].participantId.toString()) {
          matchesByRound.Quarterfinal[1].participantA = playersA[1].participantId;
          matchesByRound.Quarterfinal[1].participantB = playersD[0].participantId;
          await matchesByRound.Quarterfinal[1].save();
        }

        if (playersB[0] && playersC[1] && playersB[0].participantId.toString() !== playersC[1].participantId.toString()) {
          matchesByRound.Quarterfinal[2].participantA = playersB[0].participantId;
          matchesByRound.Quarterfinal[2].participantB = playersC[1].participantId;
          await matchesByRound.Quarterfinal[2].save();
        }

        if (playersB[1] && playersC[0] && playersB[1].participantId.toString() !== playersC[0].participantId.toString()) {
          matchesByRound.Quarterfinal[3].participantA = playersB[1].participantId;
          matchesByRound.Quarterfinal[3].participantB = playersC[0].participantId;
          await matchesByRound.Quarterfinal[3].save();
        }
      }
    } else {
      // Generic pairing for other configurations - ensure no same team matches
      let playerIndex = 0;
      for (const match of matchesByRound.Quarterfinal) {
        if (!match.participantA && playerIndex < quarterfinalParticipants.length) {
          const pA = quarterfinalParticipants[playerIndex++];
          match.participantA = pA;
          await match.save();
        }
        if (!match.participantB && playerIndex < quarterfinalParticipants.length) {
          const pB = quarterfinalParticipants[playerIndex++];
          // Ensure participantB is different from participantA
          if (match.participantA && match.participantA.toString() !== pB.toString()) {
            match.participantB = pB;
            await match.save();
          } else if (playerIndex < quarterfinalParticipants.length) {
            // Skip this one and try next
            const nextP = quarterfinalParticipants[playerIndex++];
            if (match.participantA && match.participantA.toString() !== nextP.toString()) {
              match.participantB = nextP;
              await match.save();
            }
          }
        }
      }
    }
  } else if (matchesByRound.Semifinal.length > 0 && matchesByRound.Quarterfinal.length === 0) {
    // Direct semifinal (no quarterfinal) - fill semifinal matches
    const semifinalParticipants = qualifiedPlayers.map(qp => qp.participantId);
    let playerIndex = 0;
    for (const match of matchesByRound.Semifinal) {
      if (!match.participantA && playerIndex < semifinalParticipants.length) {
        const pA = semifinalParticipants[playerIndex++];
        match.participantA = pA;
        await match.save();
      }
      if (!match.participantB && playerIndex < semifinalParticipants.length) {
        const pB = semifinalParticipants[playerIndex++];
        // Ensure participantB is different from participantA
        if (match.participantA && match.participantA.toString() !== pB.toString()) {
          match.participantB = pB;
          await match.save();
        } else if (playerIndex < semifinalParticipants.length) {
          const nextP = semifinalParticipants[playerIndex++];
          if (match.participantA && match.participantA.toString() !== nextP.toString()) {
            match.participantB = nextP;
            await match.save();
          }
        }
      }
    }
  } else if (matchesByRound.Final.length > 0 && matchesByRound.Semifinal.length === 0 && matchesByRound.Quarterfinal.length === 0) {
    // Direct final - fill final match
    const finalParticipants = qualifiedPlayers.map(qp => qp.participantId);
    if (matchesByRound.Final.length > 0) {
      const finalMatch = matchesByRound.Final[0];
      if (!finalMatch.participantA && finalParticipants.length > 0) {
        finalMatch.participantA = finalParticipants[0];
        await finalMatch.save();
      }
      if (!finalMatch.participantB && finalParticipants.length > 1) {
        const pB = finalParticipants[1];
        // Ensure participantB is different from participantA
        if (finalMatch.participantA && finalMatch.participantA.toString() !== pB.toString()) {
          finalMatch.participantB = pB;
          await finalMatch.save();
        }
      }
    }
  }

  // Semifinal and Final will be filled automatically when previous rounds complete
  // via the existing progression logic
}

