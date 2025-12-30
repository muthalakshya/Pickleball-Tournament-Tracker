import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

/**
 * Update match progression - advance winner to next round
 * @param {Object} match - Completed match document
 */
export const updateMatchProgression = async (match) => {
  if (!match.nextMatch) {
    return; // No next match to update
  }

  const nextMatch = await Match.findById(match.nextMatch);
  if (!nextMatch) {
    return;
  }

  // Update the next match with the winner
  if (match.nextMatchPosition === 'player1' || match.nextMatchPosition === 'team1') {
    if (match.winnerModel === 'Player') {
      nextMatch.player1 = match.winner;
    } else {
      nextMatch.team1 = match.winner;
    }
  } else {
    if (match.winnerModel === 'Player') {
      nextMatch.player2 = match.winner;
    } else {
      nextMatch.team2 = match.winner;
    }
  }

  // If both positions are filled, change status from 'bye' to 'upcoming'
  if (nextMatch.status === 'bye') {
    const hasPlayer1 = nextMatch.player1 || nextMatch.team1;
    const hasPlayer2 = nextMatch.player2 || nextMatch.team2;
    if (hasPlayer1 && hasPlayer2) {
      nextMatch.status = 'upcoming';
    }
  }

  await nextMatch.save();

  // Update statistics for winner and loser
  await updateParticipantStats(match);
};

/**
 * Update participant statistics (wins, losses, points)
 * @param {Object} match - Completed match document
 */
const updateParticipantStats = async (match) => {
  const winnerId = match.winner;
  const isSingles = match.player1 || match.player2;
  
  let winner, loser;
  
  if (isSingles) {
    winner = match.player1?.toString() === winnerId?.toString() ? match.player1 : match.player2;
    loser = match.player1?.toString() === winnerId?.toString() ? match.player2 : match.player1;
    
    if (winner) {
      await Player.findByIdAndUpdate(winner, {
        $inc: { wins: 1, pointsFor: match.score1 > match.score2 ? match.score1 : match.score2 },
      });
    }
    if (loser) {
      await Player.findByIdAndUpdate(loser, {
        $inc: { losses: 1, pointsAgainst: match.score1 > match.score2 ? match.score1 : match.score2 },
      });
    }
  } else {
    winner = match.team1?.toString() === winnerId?.toString() ? match.team1 : match.team2;
    loser = match.team1?.toString() === winnerId?.toString() ? match.team2 : match.team1;
    
    if (winner) {
      await Team.findByIdAndUpdate(winner, {
        $inc: { wins: 1, pointsFor: match.score1 > match.score2 ? match.score1 : match.score2 },
      });
    }
    if (loser) {
      await Team.findByIdAndUpdate(loser, {
        $inc: { losses: 1, pointsAgainst: match.score1 > match.score2 ? match.score1 : match.score2 },
      });
    }
  }
};

/**
 * Calculate group standings
 * @param {String} tournamentId - Tournament ID
 * @param {String} groupName - Group name
 * @returns {Array} Sorted standings array
 */
export const calculateGroupStandings = async (tournamentId, groupName) => {
  const matches = await Match.find({
    tournament: tournamentId,
    round: 'group',
    group: groupName,
    status: 'completed',
  });

  // TODO: Implement standings calculation
  // This should aggregate wins, losses, points for/against for each participant
  // and return sorted by: wins (desc), point difference (desc), points for (desc)
  
  return [];
};

