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

  // Handle group stage knockout matches (within a group)
  if (roundComplete && match.round.startsWith('Group ')) {
    // This is a group stage match - check if we need to generate next round within the group
    const groupName = match.round.replace('Group ', '');
    const groupMatches = await Match.find({
      tournamentId: tournament._id,
      round: match.round
    });
    
    // Check if all matches in this group round are complete
    const allComplete = groupMatches.every(m => m.status === 'completed');
    
    if (allComplete) {
      // Get winners from this group round
      const winners = await getRoundWinners(tournament._id, match.round);
      
      // Check if there's a next round in this group (e.g., "Group A - Round 2")
      // For knockout format within groups, we might have multiple rounds
      // Check if next round exists or needs to be created
      const nextGroupRound = `Group ${groupName} - Round 2`; // Assuming round numbering
      const nextRoundMatches = await Match.find({
        tournamentId: tournament._id,
        round: nextGroupRound
      });
      
      if (nextRoundMatches.length > 0) {
        // Next round exists - auto-fill TBD participants
        let winnerIndex = 0;
        for (const nextMatch of nextRoundMatches) {
          if (!nextMatch.participantA && winnerIndex < winners.length) {
            nextMatch.participantA = winners[winnerIndex++];
            await nextMatch.save();
          }
          if (!nextMatch.participantB && winnerIndex < winners.length) {
            nextMatch.participantB = winners[winnerIndex++];
            await nextMatch.save();
          }
        }
        progression.nextRoundFilled = true;
        progression.updatedRounds.push(nextGroupRound);
      } else if (winners.length > 1) {
        // Next round doesn't exist but we have winners - create it
        const newMatches = await generateNextRoundMatches(
          tournament._id,
          match.round,
          nextGroupRound
        );
        progression.nextRoundGenerated = true;
        progression.newMatches = newMatches.length;
        progression.updatedRounds.push(nextGroupRound);
      } else {
        // Group knockout complete - winner advances
        progression.groupRoundComplete = true;
        progression.groupName = groupName;
        progression.winner = winners[0];
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

