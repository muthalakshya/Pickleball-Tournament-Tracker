/**
 * Standings Calculation Service
 * 
 * This service calculates tournament standings with proper tie-breaking rules.
 * 
 * Ranking Priority (in order):
 * 1. Highest Wins
 * 2. Highest Point Difference (Points Scored - Points Conceded)
 * 3. Highest Points Scored
 * 4. Head-to-head result (if tied participants played each other)
 * 5. Random / Admin decision (fallback)
 */

/**
 * Calculate Head-to-Head Result
 * 
 * Determines the head-to-head winner between two participants.
 * 
 * @param {string} participantId1 - First participant ID
 * @param {string} participantId2 - Second participant ID
 * @param {Array} completedMatches - Array of completed match objects
 * @returns {Object|null} Object with winner or null if no head-to-head match
 */
export const getHeadToHeadResult = (participantId1, participantId2, completedMatches) => {
  const match = completedMatches.find(m => {
    const isA1 = m.participantA._id.toString() === participantId1.toString();
    const isB1 = m.participantB._id.toString() === participantId1.toString();
    const isA2 = m.participantA._id.toString() === participantId2.toString();
    const isB2 = m.participantB._id.toString() === participantId2.toString();
    
    return (isA1 && isB2) || (isB1 && isA2);
  });

  if (!match) {
    return null; // No head-to-head match
  }

  const participant1Score = match.participantA._id.toString() === participantId1.toString()
    ? match.score.a
    : match.score.b;
  const participant2Score = match.participantA._id.toString() === participantId2.toString()
    ? match.score.a
    : match.score.b;

  if (participant1Score > participant2Score) {
    return { winner: participantId1, loser: participantId2 };
  } else if (participant2Score > participant1Score) {
    return { winner: participantId2, loser: participantId1 };
  }

  return null; // Draw (shouldn't happen in pickleball, but handle it)
};

/**
 * Calculate Standings for Participants
 * 
 * Calculates comprehensive standings including:
 * - Matches Played
 * - Wins
 * - Losses
 * - Points Scored
 * - Points Conceded
 * - Point Difference
 * - Win Rate
 * 
 * @param {Array} participants - Array of participant objects
 * @param {Array} completedMatches - Array of completed match objects (populated)
 * @returns {Array} Array of standing objects with participant and stats
 */
export const calculateStandings = (participants, completedMatches) => {
  const standings = participants.map(participant => {
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let matchesPlayed = 0;

    // Process all matches involving this participant
    completedMatches.forEach(match => {
      const isParticipantA = match.participantA._id.toString() === participant._id.toString();
      const isParticipantB = match.participantB._id.toString() === participant._id.toString();

      if (isParticipantA || isParticipantB) {
        matchesPlayed++;
        const participantScore = isParticipantA ? match.score.a : match.score.b;
        const opponentScore = isParticipantA ? match.score.b : match.score.a;

        pointsFor += participantScore;
        pointsAgainst += opponentScore;

        if (participantScore > opponentScore) {
          wins++;
        } else {
          losses++;
        }
      }
    });

    // Calculate win rate
    const winRate = matchesPlayed > 0 ? (wins / matchesPlayed * 100).toFixed(1) : 0;
    const pointDifference = pointsFor - pointsAgainst;

    return {
      participant: {
        id: participant._id,
        name: participant.name,
        players: participant.players
      },
      stats: {
        matchesPlayed,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        pointDifference,
        winRate: parseFloat(winRate)
      }
    };
  });

  return standings;
};

/**
 * Sort Standings with Tie-Breaking Rules
 * 
 * Sorts standings according to the priority rules:
 * 1. Wins (descending)
 * 2. Point Difference (descending)
 * 3. Points Scored (descending)
 * 4. Head-to-head result
 * 5. Random (fallback)
 * 
 * @param {Array} standings - Array of standing objects
 * @param {Array} completedMatches - Array of completed match objects (for head-to-head)
 * @returns {Array} Sorted standings array
 */
export const sortStandings = (standings, completedMatches) => {
  // First, sort by primary criteria (wins, point difference, points scored)
  standings.sort((a, b) => {
    // 1. Highest Wins
    if (b.stats.wins !== a.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }
    
    // 2. Highest Point Difference
    if (b.stats.pointDifference !== a.stats.pointDifference) {
      return b.stats.pointDifference - a.stats.pointDifference;
    }
    
    // 3. Highest Points Scored
    if (b.stats.pointsFor !== a.stats.pointsFor) {
      return b.stats.pointsFor - a.stats.pointsFor;
    }
    
    // 4. Head-to-head (if tied on all above)
    const headToHead = getHeadToHeadResult(
      a.participant.id,
      b.participant.id,
      completedMatches
    );
    
    if (headToHead) {
      if (headToHead.winner.toString() === a.participant.id.toString()) {
        return -1; // A wins head-to-head
      } else {
        return 1; // B wins head-to-head
      }
    }
    
    // 5. Random / Admin decision (fallback - maintain current order)
    return 0;
  });

  // Add position/rank to each standing
  standings.forEach((standing, index) => {
    standing.position = index + 1;
  });

  return standings;
};

/**
 * Calculate Group Standings
 * 
 * Calculates standings for a specific group in a group stage tournament.
 * 
 * @param {Array} groupParticipants - Array of participant IDs in the group
 * @param {Array} allParticipants - Array of all participant objects
 * @param {Array} completedMatches - Array of completed match objects
 * @param {string} groupName - Name of the group (e.g., "Group A")
 * @returns {Array} Sorted standings for the group
 */
export const calculateGroupStandings = (groupParticipants, allParticipants, completedMatches, groupName) => {
  // Filter participants in this group
  const groupParticipantObjects = allParticipants.filter(p =>
    groupParticipants.some(gp => gp.toString() === p._id.toString())
  );

  // Filter matches for this group
  const groupMatches = completedMatches.filter(match => {
    const matchRound = match.round || '';
    return matchRound.includes(groupName);
  });

  // Calculate standings
  const standings = calculateStandings(groupParticipantObjects, groupMatches);
  
  // Sort with tie-breaking
  return sortStandings(standings, groupMatches);
};

