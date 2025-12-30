import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

/**
 * Generate fixtures based on tournament format
 * @param {Object} tournament - Tournament document
 * @returns {Array} Array of created matches
 */
export const generateFixturesService = async (tournament) => {
  // Get participants based on tournament type
  let participants;
  if (tournament.tournamentType === 'singles') {
    participants = await Player.find({ tournament: tournament._id })
      .sort({ seed: 1, name: 1 });
  } else {
    participants = await Team.find({ tournament: tournament._id })
      .populate('player1 player2')
      .sort({ seed: 1, name: 1 });
  }

  if (participants.length < 2) {
    throw new Error('Need at least 2 participants to generate fixtures');
  }

  let matches = [];

  switch (tournament.format) {
    case 'round-robin':
      matches = await generateRoundRobin(tournament, participants);
      break;
    case 'knockout':
      matches = await generateKnockout(tournament, participants);
      break;
    case 'group':
      matches = await generateGroupStage(tournament, participants);
      break;
    default:
      throw new Error(`Unsupported tournament format: ${tournament.format}`);
  }

  return matches;
};

/**
 * Generate round-robin fixtures (everyone plays everyone)
 */
const generateRoundRobin = async (tournament, participants) => {
  const matches = [];
  let matchNumber = 1;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const matchData = {
        tournament: tournament._id,
        round: 'round-robin',
        matchNumber: matchNumber++,
        status: 'upcoming',
      };

      if (tournament.tournamentType === 'singles') {
        matchData.player1 = participants[i]._id;
        matchData.player2 = participants[j]._id;
      } else {
        matchData.team1 = participants[i]._id;
        matchData.team2 = participants[j]._id;
      }

      matches.push(matchData);
    }
  }

  return await Match.insertMany(matches);
};

/**
 * Generate knockout bracket (single elimination)
 * TODO: Handle odd numbers with byes
 * TODO: Generate QF, SF, Final rounds progressively
 */
const generateKnockout = async (tournament, participants) => {
  const matches = [];
  const numParticipants = participants.length;
  
  // Determine number of rounds needed
  let numRounds = Math.ceil(Math.log2(numParticipants));
  let currentRoundParticipants = [...participants];
  let matchNumber = 1;

  // Generate initial round (round of 16, 8, etc.)
  const roundNames = ['final', 'semifinal', 'quarterfinal'];
  let roundIndex = 0;

  // Start from the earliest round and work backwards
  // For now, generate all rounds at once (simplified)
  // In production, you'd generate later rounds as previous rounds complete
  
  // Calculate first round size (power of 2 closest to numParticipants)
  let firstRoundSize = Math.pow(2, numRounds);
  
  // Handle byes for odd numbers
  const byes = firstRoundSize - numParticipants;
  
  // Generate first round matches
  let participantIndex = 0;
  for (let i = 0; i < firstRoundSize / 2; i++) {
    const matchData = {
      tournament: tournament._id,
      round: numRounds === 1 ? 'final' : numRounds === 2 ? 'semifinal' : 'quarterfinal',
      matchNumber: matchNumber++,
      status: 'upcoming',
    };

    if (participantIndex < participants.length) {
      if (tournament.tournamentType === 'singles') {
        matchData.player1 = participants[participantIndex++]._id;
      } else {
        matchData.team1 = participants[participantIndex++]._id;
      }
    } else {
      // Bye
      matchData.status = 'bye';
    }

    if (participantIndex < participants.length) {
      if (tournament.tournamentType === 'singles') {
        matchData.player2 = participants[participantIndex++]._id;
      } else {
        matchData.team2 = participants[participantIndex++]._id;
      }
    } else {
      // Bye
      matchData.status = 'bye';
    }

    matches.push(matchData);
  }

  // TODO: Generate subsequent rounds (semifinals, finals) with nextMatch references
  // This is a simplified version - in production, you'd want to:
  // 1. Generate matches progressively as rounds complete
  // 2. Link matches using nextMatch and nextMatchPosition
  // 3. Handle byes properly

  return await Match.insertMany(matches);
};

/**
 * Generate group stage fixtures
 * TODO: Implement group stage logic
 * For now, creates a simple round-robin within groups
 */
const generateGroupStage = async (tournament, participants) => {
  // Simple implementation: divide into 2 groups
  // TODO: Make group configuration flexible
  const numGroups = tournament.groups?.length || 2;
  const participantsPerGroup = Math.ceil(participants.length / numGroups);
  
  const matches = [];
  let matchNumber = 1;

  for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
    const groupStart = groupIndex * participantsPerGroup;
    const groupEnd = Math.min(groupStart + participantsPerGroup, participants.length);
    const groupParticipants = participants.slice(groupStart, groupEnd);
    const groupName = tournament.groups?.[groupIndex]?.name || `Group ${String.fromCharCode(65 + groupIndex)}`;

    // Round-robin within group
    for (let i = 0; i < groupParticipants.length; i++) {
      for (let j = i + 1; j < groupParticipants.length; j++) {
        const matchData = {
          tournament: tournament._id,
          round: 'group',
          group: groupName,
          matchNumber: matchNumber++,
          status: 'upcoming',
        };

        if (tournament.tournamentType === 'singles') {
          matchData.player1 = groupParticipants[i]._id;
          matchData.player2 = groupParticipants[j]._id;
        } else {
          matchData.team1 = groupParticipants[i]._id;
          matchData.team2 = groupParticipants[j]._id;
        }

        matches.push(matchData);
      }
    }
  }

  return await Match.insertMany(matches);
};

