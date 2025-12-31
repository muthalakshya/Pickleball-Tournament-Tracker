/**
 * Fixture Generation Service
 * 
 * This service contains algorithms for generating tournament fixtures/matches
 * based on tournament format (group, roundRobin, knockout).
 * 
 * Follows comprehensive tournament fixture formation rules:
 * - Round Robin: Every participant plays every other participant exactly once
 * - Group Stage: Participants divided into groups, round robin within each group
 * - Knockout: Single elimination bracket with power-of-2 requirement and byes
 * 
 * Features:
 * - Prevents duplicate matches
 * - Handles odd participant counts with byes (knockout only)
 * - Even distribution for group stages
 * - Proper round naming and ordering
 * - Knockout: Creates ALL rounds upfront with TBD (null) participants for future rounds
 */

/**
 * Generate Round Robin Fixtures
 * 
 * Algorithm: Round Robin Tournament
 * - Each participant plays every other participant exactly once
 * - Total matches = N × (N - 1) / 2, where N = number of participants
 * - No byes required for odd counts (everyone still plays all others)
 * - Order does not matter (A vs B = B vs A, only one match created)
 * 
 * Example with 4 participants (A, B, C, D):
 * - A vs B, A vs C, A vs D
 * - B vs C, B vs D
 * - C vs D
 * Total: 6 matches = 4 × 3 / 2
 * 
 * Example with 5 participants (A, B, C, D, E):
 * - A vs B, A vs C, A vs D, A vs E
 * - B vs C, B vs D, B vs E
 * - C vs D, C vs E
 * - D vs E
 * Total: 10 matches = 5 × 4 / 2
 * 
 * @param {Array} participants - Array of participant IDs
 * @returns {Array} Array of match objects with round, participantA, participantB, order
 */
export const generateRoundRobinFixtures = (participants) => {
  const matches = [];
  const n = participants.length;
  
  // Validation: Minimum 3 participants for round robin (per rules)
  if (n < 3) {
    throw new Error('Round Robin format requires at least 3 participants');
  }

  // Generate all unique pairs (no duplicates)
  // For each participant, pair with all participants that come after them
  let matchOrder = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matches.push({
        round: 'Round Robin',
        participantA: participants[i],
        participantB: participants[j],
        order: matchOrder++
      });
    }
  }

  // Verify match count: should be N × (N - 1) / 2
  const expectedMatches = (n * (n - 1)) / 2;
  if (matches.length !== expectedMatches) {
    throw new Error(`Match count mismatch: expected ${expectedMatches}, got ${matches.length}`);
  }

  return matches;
};

/**
 * Generate Group Stage Fixtures
 * 
 * Algorithm: Group Stage Tournament
 * - Divide participants into groups
 * - Distribute participants as evenly as possible (difference ≤ 1)
 * - Each group plays round robin within itself
 * - No cross-group matches
 * 
 * Group Formation Rules:
 * - Decide number of groups (G) or participants per group
 * - Distribute participants evenly: difference between group sizes ≤ 1
 * - Example: 10 players, 3 groups → Group A: 4, Group B: 3, Group C: 3
 * 
 * Minimum Requirements:
 * - Minimum: groups × 2 participants
 * 
 * @param {Array} participants - Array of participant IDs
 * @param {number} numGroups - Number of groups (optional, will calculate if not provided)
 * @param {number} groupSize - Desired participants per group (optional, default: 4)
 * @returns {Array} Array of match objects with round, participantA, participantB, order
 */
export const generateGroupFixtures = (participants, numGroups = null, groupSize = 4) => {
  const matches = [];
  const n = participants.length;

  // Validation: Minimum participants
  if (n < 2) {
    throw new Error('Group Stage format requires at least 2 participants');
  }

  // Calculate number of groups if not provided
  let calculatedNumGroups = numGroups;
  if (!calculatedNumGroups) {
    // Calculate based on desired group size
    calculatedNumGroups = Math.ceil(n / groupSize);
  }

  // Validation: Minimum groups × 2 participants
  if (n < calculatedNumGroups * 2) {
    throw new Error(`Group Stage requires at least ${calculatedNumGroups * 2} participants for ${calculatedNumGroups} groups`);
  }

  // Distribute participants evenly across groups
  // Difference between group sizes should be ≤ 1
  const baseGroupSize = Math.floor(n / calculatedNumGroups);
  const remainder = n % calculatedNumGroups;
  
  const groups = [];
  let participantIndex = 0;

  // Shuffle participants for random group assignment
  // (In production, you might want to seed this for consistency or use seeding)
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Create groups with even distribution
  for (let i = 0; i < calculatedNumGroups; i++) {
    const currentGroupSize = baseGroupSize + (i < remainder ? 1 : 0);
    const group = shuffled.slice(participantIndex, participantIndex + currentGroupSize);
    groups.push(group);
    participantIndex += currentGroupSize;
  }

  // Generate round robin matches for each group
  let globalOrder = 0;
  groups.forEach((group, groupIndex) => {
    if (group.length < 2) {
      return; // Skip groups with less than 2 participants
    }

    const groupName = String.fromCharCode(65 + groupIndex); // A, B, C, etc.
    
    // Generate round robin matches within this group
    const groupMatches = generateRoundRobinFixtures(group);

    // Update round names and order for group matches
    groupMatches.forEach(match => {
      matches.push({
        round: `Group ${groupName}`,
        participantA: match.participantA,
        participantB: match.participantB,
        order: globalOrder++
      });
    });
  });

  return matches;
};

/**
 * Check if a number is a power of 2
 * 
 * @param {number} n - Number to check
 * @returns {boolean} True if n is a power of 2
 */
const isPowerOf2 = (n) => {
  return n > 0 && (n & (n - 1)) === 0;
};

/**
 * Get next power of 2 greater than or equal to n
 * 
 * @param {number} n - Number
 * @returns {number} Next power of 2
 */
const getNextPowerOf2 = (n) => {
  if (n <= 0) return 1;
  if (isPowerOf2(n)) return n;
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

/**
 * Generate Knockout Bracket Fixtures
 * 
 * Algorithm: Single Elimination Tournament (Knockout)
 * - Participants compete in brackets
 * - Loser is eliminated, winner advances
 * - Bracket size must be a power of 2: 2, 4, 8, 16, 32...
 * 
 * NEW BEHAVIOR: Creates ALL rounds upfront
 * - First round: Matches between teams, odd teams get byes
 * - Subsequent rounds: Participants set as null (TBD - To Be Declared)
 * - TBD participants will be auto-filled when previous round completes
 * - Admin can manually update TBD participants if needed
 * 
 * Bye Handling (for non-power-of-2 participant counts):
 * - Find next power of 2 → P
 * - Number of byes = P - N (where N = number of participants)
 * - Byes are assigned based on seeding (if available) or randomly
 * - Bye = auto-win, no match played, participant advances automatically
 * 
 * Example with 6 participants:
 * - Next power of 2 = 8
 * - Byes = 8 - 6 = 2
 * - 2 participants get byes and advance automatically
 * 
 * Round Names:
 * - Round of 32 → Quarter Finals → Semi Finals → Final
 * - Or: Round of 16 → Quarter Finals → Semi Finals → Final
 * - Or: Quarter Finals → Semi Finals → Final
 * - Or: Semi Finals → Final
 * - Or: Final
 * 
 * @param {Array} participants - Array of participant IDs
 * @param {Array} seeding - Optional seeding order (higher index = better seed, gets bye priority)
 * @returns {Object} Object with matches array and bracket structure
 */
export const generateKnockoutFixtures = (participants, seeding = null) => {
  const matches = [];
  const n = participants.length;

  // Validation: Minimum 2 participants for knockout
  if (n < 2) {
    throw new Error('Knockout format requires at least 2 participants');
  }

  // Calculate bracket size (must be power of 2)
  const bracketSize = getNextPowerOf2(n);
  const byes = bracketSize - n;

  // Determine round names based on bracket size
  const getRoundName = (roundIndex, totalRounds) => {
    const roundNames = {
      1: 'Final',
      2: 'Semi Finals',
      3: 'Quarter Finals',
      4: 'Round of 16',
      5: 'Round of 32'
    };
    return roundNames[roundIndex] || `Round ${roundIndex}`;
  };

  const totalRounds = Math.log2(bracketSize);
  
  // Prepare participants with seeding
  let participantList = participants.map((p, index) => ({
    id: p,
    seed: seeding ? seeding.indexOf(p) : index,
    hasBye: false
  }));

  // Sort by seed (higher seed = better, gets bye priority)
  // If no seeding, randomize
  if (!seeding) {
    participantList = participantList.sort(() => Math.random() - 0.5);
  } else {
    participantList = participantList.sort((a, b) => b.seed - a.seed);
  }

  // Assign byes to top seeds (if any)
  for (let i = 0; i < byes && i < participantList.length; i++) {
    participantList[i].hasBye = true;
  }

  // Separate participants with byes and without byes
  const byeParticipants = participantList
    .filter(p => p.hasBye)
    .map(p => p.id);
  
  const firstRoundParticipants = participantList
    .filter(p => !p.hasBye)
    .map(p => p.id);

  // Calculate how many participants will advance from first round
  // First round matches: firstRoundParticipants.length / 2 winners (if even)
  // Plus: byeParticipants.length (auto-advance)
  const firstRoundWinners = Math.floor(firstRoundParticipants.length / 2);
  const totalAdvancing = firstRoundWinners + byeParticipants.length;

  let matchOrder = 0;

  // ============================================
  // ROUND 1: Create matches for non-bye participants
  // ============================================
  const round1Name = getRoundName(totalRounds, totalRounds);
  const round1Winners = []; // Track winners (will be TBD/null for now)

  // Create matches for participants without byes
  for (let i = 0; i < firstRoundParticipants.length; i += 2) {
    if (i + 1 < firstRoundParticipants.length) {
      // Both participants available - create match
      matches.push({
        round: round1Name,
        participantA: firstRoundParticipants[i],
        participantB: firstRoundParticipants[i + 1],
        order: matchOrder++
      });
      // Winner will be determined when match completes (TBD for now)
      round1Winners.push(null); // TBD - will be filled when match completes
    } else {
      // Odd number of non-bye participants - this one gets a bye to next round
      round1Winners.push(firstRoundParticipants[i]);
    }
  }

  // Add bye participants to winners list (they advance automatically)
  byeParticipants.forEach(byeParticipant => {
    round1Winners.push(byeParticipant);
  });

  // ============================================
  // SUBSEQUENT ROUNDS: Create all rounds with TBD participants
  // ============================================
  let currentRoundParticipants = round1Winners; // Start with round 1 winners/byes
  let currentRound = totalRounds - 1; // Start from second-to-last round

  while (currentRound > 0 && currentRoundParticipants.length > 1) {
    const roundName = getRoundName(currentRound, totalRounds);
    const nextRoundParticipants = [];

    // Pair participants for this round
    for (let i = 0; i < currentRoundParticipants.length; i += 2) {
      if (i + 1 < currentRoundParticipants.length) {
        const participantA = currentRoundParticipants[i];
        const participantB = currentRoundParticipants[i + 1];

        // If both are real participants (not null), place them directly
        // This happens when bye participants advance
        if (participantA !== null && participantB !== null) {
          // Both participants are known (byes), create match with actual participants
          matches.push({
            round: roundName,
            participantA: participantA, // Real participant (bye)
            participantB: participantB, // Real participant (bye)
            order: matchOrder++
          });
          // Winner will be determined when match completes (TBD for now)
          nextRoundParticipants.push(null); // TBD - will be filled when match completes
        } else if (participantA !== null) {
          // Only participantA is known (bye), participantB is TBD (match winner)
          matches.push({
            round: roundName,
            participantA: participantA, // Real participant (bye)
            participantB: null, // TBD - will be filled when previous match completes
            order: matchOrder++
          });
          // Winner will be determined when match completes (TBD for now)
          nextRoundParticipants.push(null); // TBD - will be filled when match completes
        } else if (participantB !== null) {
          // Only participantB is known (bye), participantA is TBD (match winner)
          matches.push({
            round: roundName,
            participantA: null, // TBD - will be filled when previous match completes
            participantB: participantB, // Real participant (bye)
            order: matchOrder++
          });
          // Winner will be determined when match completes (TBD for now)
          nextRoundParticipants.push(null); // TBD - will be filled when match completes
        } else {
          // Both are TBD (match winners), create match with TBD participants
          matches.push({
            round: roundName,
            participantA: null, // TBD - will be filled when previous round completes
            participantB: null, // TBD - will be filled when previous round completes
            order: matchOrder++
          });
          // Winner will be determined when match completes (TBD for now)
          nextRoundParticipants.push(null); // TBD - will be filled when match completes
        }
      } else {
        // Odd number - this participant gets a bye
        // If it's a real participant (not null), they advance directly to next round
        if (currentRoundParticipants[i] !== null) {
          // Real participant (bye) - they will be placed in next round match
          nextRoundParticipants.push(currentRoundParticipants[i]);
        } else {
          // If it's null (TBD), still add null for next round
          nextRoundParticipants.push(null);
        }
      }
    }

    currentRoundParticipants = nextRoundParticipants;
    currentRound--;
  }

  return { matches, bracket: [] };
};

/**
 * Check for Duplicate Matches
 * 
 * Prevents creating duplicate matches (same two participants in same round).
 * Handles null participants (TBD) - null vs null is not considered duplicate.
 * 
 * @param {Array} matches - Array of match objects
 * @returns {boolean} True if duplicates found
 */
export const hasDuplicateMatches = (matches) => {
  const matchSet = new Set();
  
  for (const match of matches) {
    // Skip matches with null participants (TBD) - they're placeholders
    if (!match.participantA || !match.participantB) {
      continue;
    }
    
    // Create a normalized key (smaller ID first to handle A vs B = B vs A)
    const key = match.participantA.toString() < match.participantB.toString()
      ? `${match.participantA}_${match.participantB}_${match.round}`
      : `${match.participantB}_${match.participantA}_${match.round}`;
    
    if (matchSet.has(key)) {
      return true; // Duplicate found
    }
    matchSet.add(key);
  }
  
  return false;
};

/**
 * Generate Fixtures Based on Tournament Format
 * 
 * Main entry point for fixture generation.
 * Routes to appropriate algorithm based on tournament format.
 * 
 * Validations:
 * - Minimum participants based on format
 * - Prevents duplicate matches
 * - Validates format requirements
 * 
 * @param {string} format - Tournament format: 'group', 'roundRobin', or 'knockout'
 * @param {Array} participants - Array of participant IDs
 * @param {Object} options - Additional options:
 *   - groupSize: Desired participants per group (for group format)
 *   - numGroups: Number of groups (for group format)
 *   - seeding: Seeding order for knockout format
 * @returns {Array} Array of match objects ready to be saved to database
 */
export const generateFixtures = (format, participants, options = {}) => {
  if (!participants || participants.length === 0) {
    throw new Error('Participants array is required');
  }

  // Remove duplicates from participants array
  const uniqueParticipants = [...new Set(participants.map(p => p.toString()))]
    .map(p => participants.find(orig => orig.toString() === p));

  if (uniqueParticipants.length !== participants.length) {
    throw new Error('Duplicate participants found in participant list');
  }

  let matches = [];

  switch (format) {
    case 'roundRobin':
      matches = generateRoundRobinFixtures(uniqueParticipants);
      break;

    case 'group':
      const groupSize = options.groupSize || 4;
      const numGroups = options.numGroups || null;
      matches = generateGroupFixtures(uniqueParticipants, numGroups, groupSize);
      break;

    case 'knockout':
      const seeding = options.seeding || null;
      const knockoutResult = generateKnockoutFixtures(uniqueParticipants, seeding);
      matches = knockoutResult.matches;
      break;

    default:
      throw new Error(`Unsupported tournament format: ${format}`);
  }

  // Validate: Check for duplicate matches (only for matches with both participants)
  if (hasDuplicateMatches(matches)) {
    throw new Error('Duplicate matches detected in generated fixtures');
  }

  return matches;
};
