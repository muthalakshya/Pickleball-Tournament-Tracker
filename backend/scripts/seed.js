import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Tournament from '../models/Tournament.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';

dotenv.config();

/**
 * Enhanced seed script to populate database with 10 tournaments and random data
 * Run with: npm run seed
 */

// Helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Player name pools
const firstNames = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul',
  'Quinn', 'Rachel', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yara', 'Zoe', 'Alex', 'Blake', 'Casey', 'Drew', 'Ellis', 'Finley'
];

const lastNames = [
  'Johnson', 'Smith', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson',
  'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
  'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen',
  'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams'
];

const tournamentNames = [
  'Summer Pickleball Championship',
  'Spring Tournament Series',
  'Coastal Pickleball Classic',
  'Mountain View Open',
  'City Championship',
  'Regional Qualifier',
  'Holiday Tournament',
  'Elite Pickleball Cup',
  'Community Tournament',
  'Champions League'
];

const locations = [
  'Community Sports Center',
  'Riverside Park Courts',
  'Downtown Recreation Center',
  'Beachside Sports Complex',
  'Mountain View Athletic Club',
  'City Park Pickleball Courts',
  'Lakeside Recreation',
  'Sunset Sports Facility',
  'Green Valley Courts',
  'Metro Sports Complex'
];

const generatePlayerName = () => {
  return `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
};

const generateUniquePlayerNames = (count) => {
  const names = new Set();
  while (names.size < count) {
    names.add(generatePlayerName());
  }
  return Array.from(names);
};

const generateMatches = async (tournament, participants, format) => {
  const matches = [];
  let matchNumber = 1;
  const numParticipants = participants.length;
  const pointsToWin = tournament.pointsToWin || 11;

  if (format === 'round-robin') {
    // Round robin: everyone plays everyone
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const matchData = {
          tournament: tournament._id,
          round: 'round-robin',
          matchNumber: matchNumber++,
          status: randomChoice(['upcoming', 'in-progress', 'completed']),
        };

        if (tournament.tournamentType === 'singles') {
          matchData.player1 = participants[i]._id;
          matchData.player2 = participants[j]._id;
        } else {
          matchData.team1 = participants[i]._id;
          matchData.team2 = participants[j]._id;
        }

        // Generate random scores for completed matches
        if (matchData.status === 'completed') {
          const winner = randomChoice([1, 2]);
          let score1, score2;
          
          if (winner === 1) {
            score1 = pointsToWin;
            score2 = randomInt(0, pointsToWin - 2);
          } else {
            score1 = randomInt(0, pointsToWin - 2);
            score2 = pointsToWin;
          }

          matchData.score1 = score1;
          matchData.score2 = score2;
          matchData.winner = winner === 1 
            ? (participants[i]._id) 
            : (participants[j]._id);
          matchData.winnerModel = tournament.tournamentType === 'singles' ? 'Player' : 'Team';
          matchData.completedAt = randomDate(tournament.startDate, tournament.endDate);
        } else if (matchData.status === 'in-progress') {
          matchData.score1 = randomInt(0, pointsToWin - 1);
          matchData.score2 = randomInt(0, pointsToWin - 1);
          matchData.court = randomInt(1, tournament.courts);
        }

        matches.push(matchData);
      }
    }
  } else if (format === 'knockout') {
    // Knockout: simplified bracket
    const rounds = ['quarterfinal', 'semifinal', 'final'];
    let currentRoundParticipants = [...participants];
    let roundIndex = 0;

    while (currentRoundParticipants.length > 1 && roundIndex < rounds.length) {
      const round = rounds[roundIndex];
      const nextRoundParticipants = [];

      for (let i = 0; i < currentRoundParticipants.length; i += 2) {
        if (i + 1 < currentRoundParticipants.length) {
          const matchData = {
            tournament: tournament._id,
            round: round,
            matchNumber: matchNumber++,
            status: round === 'final' 
              ? randomChoice(['upcoming', 'in-progress', 'completed'])
              : randomChoice(['completed', 'upcoming']),
          };

          if (tournament.tournamentType === 'singles') {
            matchData.player1 = currentRoundParticipants[i]._id;
            matchData.player2 = currentRoundParticipants[i + 1]._id;
          } else {
            matchData.team1 = currentRoundParticipants[i]._id;
            matchData.team2 = currentRoundParticipants[i + 1]._id;
          }

          if (matchData.status === 'completed') {
            const winner = randomChoice([1, 2]);
            let score1, score2;
            
            if (winner === 1) {
              score1 = pointsToWin;
              score2 = randomInt(0, pointsToWin - 2);
            } else {
              score1 = randomInt(0, pointsToWin - 2);
              score2 = pointsToWin;
            }

            matchData.score1 = score1;
            matchData.score2 = score2;
            matchData.winner = winner === 1 
              ? currentRoundParticipants[i]._id
              : currentRoundParticipants[i + 1]._id;
            matchData.winnerModel = tournament.tournamentType === 'singles' ? 'Player' : 'Team';
            matchData.completedAt = randomDate(tournament.startDate, tournament.endDate);
            
            nextRoundParticipants.push(matchData.winner);
          } else if (matchData.status === 'in-progress') {
            matchData.score1 = randomInt(0, pointsToWin - 1);
            matchData.score2 = randomInt(0, pointsToWin - 1);
            matchData.court = randomInt(1, tournament.courts);
          }

          matches.push(matchData);
        } else {
          // Bye
          nextRoundParticipants.push(currentRoundParticipants[i]);
        }
      }

      currentRoundParticipants = nextRoundParticipants;
      roundIndex++;
    }
  } else if (format === 'group') {
    // Group stage: 2 groups
    const numGroups = 2;
    const participantsPerGroup = Math.ceil(numParticipants / numGroups);
    
    for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
      const groupStart = groupIndex * participantsPerGroup;
      const groupEnd = Math.min(groupStart + participantsPerGroup, numParticipants);
      const groupParticipants = participants.slice(groupStart, groupEnd);
      const groupName = `Group ${String.fromCharCode(65 + groupIndex)}`;

      for (let i = 0; i < groupParticipants.length; i++) {
        for (let j = i + 1; j < groupParticipants.length; j++) {
          const matchData = {
            tournament: tournament._id,
            round: 'group',
            group: groupName,
            matchNumber: matchNumber++,
            status: randomChoice(['upcoming', 'in-progress', 'completed']),
          };

          if (tournament.tournamentType === 'singles') {
            matchData.player1 = groupParticipants[i]._id;
            matchData.player2 = groupParticipants[j]._id;
          } else {
            matchData.team1 = groupParticipants[i]._id;
            matchData.team2 = groupParticipants[j]._id;
          }

          if (matchData.status === 'completed') {
            const winner = randomChoice([1, 2]);
            let score1, score2;
            
            if (winner === 1) {
              score1 = pointsToWin;
              score2 = randomInt(0, pointsToWin - 2);
            } else {
              score1 = randomInt(0, pointsToWin - 2);
              score2 = pointsToWin;
            }

            matchData.score1 = score1;
            matchData.score2 = score2;
            matchData.winner = winner === 1 
              ? groupParticipants[i]._id
              : groupParticipants[j]._id;
            matchData.winnerModel = tournament.tournamentType === 'singles' ? 'Player' : 'Team';
            matchData.completedAt = randomDate(tournament.startDate, tournament.endDate);
          } else if (matchData.status === 'in-progress') {
            matchData.score1 = randomInt(0, pointsToWin - 1);
            matchData.score2 = randomInt(0, pointsToWin - 1);
            matchData.court = randomInt(1, tournament.courts);
          }

          matches.push(matchData);
        }
      }
    }
  }

  return matches;
};

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Clear existing data
    await User.deleteMany();
    await Tournament.deleteMany();
    await Player.deleteMany();
    await Team.deleteMany();
    await Match.deleteMany();
    console.log('Cleared existing data');

    // Create organizer user
    const organizer = await User.create({
      name: 'Tournament Organizer',
      email: 'organizer@example.com',
      password: 'password123',
      role: 'organizer',
    });
    console.log('Created organizer user');

    // Generate 10 tournaments
    const tournaments = [];
    const startDate = new Date('2024-06-01');
    const endDate = new Date('2024-12-31');

    for (let i = 0; i < 10; i++) {
      const tournamentType = randomChoice(['singles', 'doubles']);
      const format = randomChoice(['knockout', 'round-robin', 'group']);
      const pointsToWin = randomChoice([11, 15]);
      const scoringSystem = randomChoice(['rally', 'traditional']);
      const status = randomChoice(['draft', 'active', 'completed']);
      const numPlayers = randomInt(4, 16);
      
      const tournamentStart = randomDate(startDate, endDate);
      const tournamentEnd = new Date(tournamentStart);
      tournamentEnd.setDate(tournamentEnd.getDate() + randomInt(1, 5));

      const tournament = await Tournament.create({
        name: tournamentNames[i] || `Tournament ${i + 1}`,
        location: locations[i] || `Location ${i + 1}`,
        startDate: tournamentStart,
        endDate: tournamentEnd,
        courts: randomInt(2, 6),
        tournamentType: tournamentType,
        format: format,
        pointsToWin: pointsToWin,
        scoringSystem: scoringSystem,
        organizer: organizer._id,
        status: status,
        isPublic: true,
        tournamentTypeRef: tournamentType === 'singles' ? 'Player' : 'Team',
      });

      tournaments.push(tournament);
      console.log(`Created tournament ${i + 1}: ${tournament.name} (${tournamentType}, ${format}, ${numPlayers} participants)`);

      // Generate players/teams
      let participants = [];
      
      if (tournamentType === 'singles') {
        const playerNames = generateUniquePlayerNames(numPlayers);
        const players = await Player.insertMany(
          playerNames.map((name, index) => ({
            name: name,
            tournament: tournament._id,
            seed: index + 1,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          }))
        );
        participants = players;
        console.log(`  Created ${players.length} players`);
      } else {
        // Doubles: create players first, then teams
        const playerNames = generateUniquePlayerNames(numPlayers * 2);
        const players = await Player.insertMany(
          playerNames.map(name => ({
            name: name,
            tournament: tournament._id,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          }))
        );

        // Create teams (pairs of players)
        const teams = [];
        for (let j = 0; j < numPlayers; j++) {
          const team = await Team.create({
            name: `Team ${String.fromCharCode(65 + j)}`,
            tournament: tournament._id,
            player1: players[j * 2]._id,
            player2: players[j * 2 + 1]._id,
            seed: j + 1,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          });
          teams.push(team);
        }
        participants = teams;
        console.log(`  Created ${players.length} players and ${teams.length} teams`);
      }

      // Generate matches with random scores
      const matchesData = await generateMatches(tournament, participants, format);
      if (matchesData.length > 0) {
        const matches = await Match.insertMany(matchesData);
        console.log(`  Created ${matches.length} matches`);

        // Update participant statistics based on completed matches
        for (const match of matches) {
          if (match.status === 'completed' && match.winner) {
            const isSingles = tournament.tournamentType === 'singles';
            const winner = isSingles ? match.player1?.toString() === match.winner.toString() ? match.player1 : match.player2
                                   : match.team1?.toString() === match.winner.toString() ? match.team1 : match.team2;
            const loser = isSingles ? match.player1?.toString() === match.winner.toString() ? match.player2 : match.player1
                                  : match.team1?.toString() === match.winner.toString() ? match.team2 : match.team1;

            if (winner) {
              if (isSingles) {
                await Player.findByIdAndUpdate(winner, {
                  $inc: { wins: 1, pointsFor: Math.max(match.score1, match.score2) },
                });
              } else {
                await Team.findByIdAndUpdate(winner, {
                  $inc: { wins: 1, pointsFor: Math.max(match.score1, match.score2) },
                });
              }
            }

            if (loser) {
              if (isSingles) {
                await Player.findByIdAndUpdate(loser, {
                  $inc: { losses: 1, pointsAgainst: Math.max(match.score1, match.score2) },
                });
              } else {
                await Team.findByIdAndUpdate(loser, {
                  $inc: { losses: 1, pointsAgainst: Math.max(match.score1, match.score2) },
                });
              }
            }
          }
        }
      }
    }

    console.log('\n✅ Seed data created successfully!');
    console.log(`\nCreated ${tournaments.length} tournaments with random data`);
    console.log('\nSample credentials:');
    console.log('Email: organizer@example.com');
    console.log('Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
