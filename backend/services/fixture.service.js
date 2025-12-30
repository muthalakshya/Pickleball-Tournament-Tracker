/**
 * Fixture Generation Service
 * 
 * This service contains algorithms for generating tournament fixtures/matches
 * based on tournament format (group, roundRobin, knockout).
 * 
 * Algorithms explained:
 * - Round Robin: Each participant plays every other participant once
 * - Group: Participants divided into groups, round robin within each group
 * - Knockout: Single elimination bracket with byes for odd participant counts
 */

/**
 * Generate Round Robin Fixtures
 * 
 * Algorithm: Round Robin Tournament
 * - Each participant plays every other participant exactly once
 * - Total matches = n * (n-1) / 2, where n = number of participants
 * - For odd counts, one participant gets a bye each round
 * 
 * Example with 4 participants (A, B, C, D):
 * Round 1: A vs B, C vs D
 * Round 2: A vs C, B vs D
 * Round 3: A vs D, B vs C
 * Total: 6 matches
 * 
 * @param {Array} participants - Array of participant IDs
 * @returns {Array} Array of match objects with round, participantA, participantB, order
 */
export const generateRoundRobinFixtures = (participants) => {
  const matches = [];
  const n = participants.length;
  
  // Handle edge case: need at least 2 participants
  if (n < 2) {
    return matches;
  }

  // For round robin, we pair participants in rounds
  // Algorithm: Rotate participants, pairing first with last, second with second-last, etc.
  const rounds = n % 2 === 0 ? n - 1 : n; // Odd number of participants = n rounds, Even = n-1 rounds
  const fixedParticipant = participants[0]; // First participant stays fixed
  const rotatingParticipants = participants.slice(1);

  for (let round = 0; round < rounds; round++) {
    const roundMatches = [];
    const currentParticipants = [fixedParticipant, ...rotatingParticipants];

    // Pair participants: first with last, second with second-last, etc.
    for (let i = 0; i < Math.floor(currentParticipants.length / 2); i++) {
      const participantA = currentParticipants[i];
      const participantB = currentParticipants[currentParticipants.length - 1 - i];
      
      roundMatches.push({
        round: `Round ${round + 1}`,
        participantA: participantA,
        participantB: participantB,
        order: roundMatches.length
      });
    }

    // Rotate participants for next round (except the fixed one)
    // Move last participant to second position
    if (rotatingParticipants.length > 0) {
      const last = rotatingParticipants.pop();
      rotatingParticipants.unshift(last);
    }

    matches.push(...roundMatches);
  }

  // Assign order numbers across all matches
  matches.forEach((match, index) => {
    match.order = index;
  });

  return matches;
};

/**
 * Generate Group Stage Fixtures
 * 
 * Algorithm: Group Stage Tournament
 * - Divide participants into groups (typically 4 per group, but flexible)
 * - Each group plays round robin within itself
 * - Groups are named Group A, Group B, etc.
 * 
 * Group size calculation:
 * - Ideal: 4 participants per group
 * - Adjust based on total participant count
 * - Minimum 2 participants per group
 * 
 * Example with 8 participants:
 * Group A (4 participants): 6 matches (round robin)
 * Group B (4 participants): 6 matches (round robin)
 * Total: 12 matches
 * 
 * @param {Array} participants - Array of participant IDs
 * @param {number} groupSize - Desired participants per group (default: 4)
 * @returns {Array} Array of match objects with round, participantA, participantB, order
 */
export const generateGroupFixtures = (participants, groupSize = 4) => {
  const matches = [];
  const n = participants.length;

  if (n < 2) {
    return matches;
  }

  // Calculate number of groups
  // Ensure at least 2 participants per group
  const minGroupSize = 2;
  const maxGroups = Math.floor(n / minGroupSize);
  const calculatedGroupSize = Math.max(minGroupSize, Math.min(groupSize, Math.floor(n / maxGroups)));
  const numGroups = Math.ceil(n / calculatedGroupSize);

  // Shuffle participants to randomize group assignments
  // (In production, you might want to seed this for consistency)
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Divide participants into groups
  const groups = [];
  for (let i = 0; i < numGroups; i++) {
    groups.push([]);
  }

  // Distribute participants evenly across groups
  shuffled.forEach((participant, index) => {
    groups[index % numGroups].push(participant);
  });

  // Generate round robin matches for each group
  let globalOrder = 0;
  groups.forEach((group, groupIndex) => {
    if (group.length < 2) {
      return; // Skip groups with less than 2 participants
    }

    const groupName = String.fromCharCode(65 + groupIndex); // A, B, C, etc.
    const groupMatches = generateRoundRobinFixtures(group);

    // Update round names and order for group matches
    groupMatches.forEach(match => {
      matches.push({
        round: `Group ${groupName} - ${match.round}`,
        participantA: match.participantA,
        participantB: match.participantB,
        order: globalOrder++
      });
    });
  });

  return matches;
};

/**
 * Generate Knockout Bracket Fixtures
 * 
 * Algorithm: Single Elimination Tournament (Knockout)
 * - Participants compete in brackets
 * - Loser is eliminated, winner advances
 * - Handles odd counts with byes (automatic advancement)
 * 
 * Bracket structure:
 * - First round: All participants (with byes if odd count)
 * - Subsequent rounds: Winners only
 * - Final round: Championship match
 * 
 * Bye handling:
 * - If participant count is not a power of 2, some participants get byes
 * - Byes are represented as matches with only participantA (participantB = null)
 * - In our implementation, we'll pair byes with actual participants
 * 
 * Example with 5 participants (A, B, C, D, E):
 * Round 1 (Quarter Finals): 
 *   - A vs B
 *   - C vs D
 *   - E gets bye (advances automatically)
 * Round 2 (Semi Finals):
 *   - Winner(A vs B) vs Winner(C vs D)
 *   - E vs (will be determined after Round 1)
 * Round 3 (Final):
 *   - Winner of Semi Finals
 * 
 * @param {Array} participants - Array of participant IDs
 * @returns {Object} Object with matches array and bracket structure
 */
export const generateKnockoutFixtures = (participants) => {
  const matches = [];
  const n = participants.length;

  if (n < 2) {
    return { matches: [], bracket: [] };
  }

  // Calculate number of rounds needed
  // We need the smallest power of 2 that is >= n
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(n)));
  const totalSlots = nextPowerOf2;
  const byes = totalSlots - n;

  // Shuffle participants for random bracket placement
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Determine appropriate round names based on bracket size
  const getRoundName = (roundIndex, totalRounds) => {
    const roundNames = ['Final', 'Semi Finals', 'Quarter Finals', 'Round of 16', 'Round of 32'];
    const index = totalRounds - roundIndex - 1;
    return roundNames[index] || `Round ${roundIndex + 1}`;
  };

  const totalRounds = Math.ceil(Math.log2(totalSlots));
  let matchOrder = 0;
  
  // Generate matches round by round
  // Start with all participants in first round
  let currentRoundParticipants = [...shuffled];
  let currentRound = 0;

  // Add null placeholders for byes in first round
  while (currentRoundParticipants.length < totalSlots) {
    currentRoundParticipants.push(null); // Bye placeholder
  }

  // Generate all rounds
  while (currentRoundParticipants.length > 1) {
    const roundMatches = [];
    const nextRoundParticipants = [];

    // Pair participants for this round
    for (let i = 0; i < currentRoundParticipants.length; i += 2) {
      const participantA = currentRoundParticipants[i];
      const participantB = currentRoundParticipants[i + 1];

      if (participantA && participantB) {
        // Both participants available - create match
        roundMatches.push({
          round: getRoundName(currentRound, totalRounds),
          participantA: participantA,
          participantB: participantB,
          order: matchOrder++
        });
        // Placeholder: winner will be determined when match completes
        // For now, use participantA as placeholder (will be updated when match completes)
        nextRoundParticipants.push(participantA);
      } else if (participantA) {
        // Only participantA - this is a bye, participant advances automatically
        // Don't create a match for byes
        nextRoundParticipants.push(participantA);
      } else if (participantB) {
        // Only participantB - this is a bye, participant advances automatically
        nextRoundParticipants.push(participantB);
      }
      // If both are null, skip (shouldn't happen in proper bracket)
    }

    matches.push(...roundMatches);
    currentRoundParticipants = nextRoundParticipants;
    currentRound++;
  }

  return { matches, bracket: [] };
};

/**
 * Generate Fixtures Based on Tournament Format
 * 
 * Main entry point for fixture generation.
 * Routes to appropriate algorithm based on tournament format.
 * 
 * @param {string} format - Tournament format: 'group', 'roundRobin', or 'knockout'
 * @param {Array} participants - Array of participant IDs
 * @param {Object} options - Additional options (e.g., groupSize for group format)
 * @returns {Array} Array of match objects ready to be saved to database
 */
export const generateFixtures = (format, participants, options = {}) => {
  if (!participants || participants.length < 2) {
    throw new Error('At least 2 participants are required to generate fixtures');
  }

  let matches = [];

  switch (format) {
    case 'roundRobin':
      matches = generateRoundRobinFixtures(participants);
      break;

    case 'group':
      const groupSize = options.groupSize || 4;
      matches = generateGroupFixtures(participants, groupSize);
      break;

    case 'knockout':
      const knockoutResult = generateKnockoutFixtures(participants);
      // Filter out matches with byes (participantB = null) for now
      // In a full implementation, you might want to handle byes differently
      matches = knockoutResult.matches.filter(m => m.participantB !== null);
      break;

    default:
      throw new Error(`Unsupported tournament format: ${format}`);
  }

  return matches;
};

