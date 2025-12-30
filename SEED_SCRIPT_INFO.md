# Seed Script Information

## Enhanced Seed Script

The seed script (`backend/scripts/seed.js`) has been enhanced to generate **10 tournaments** with random data.

### Features

- **10 Different Tournaments**: Each with unique configurations
- **Random Player Counts**: 4-16 players per tournament
- **Varied Tournament Types**: Mix of singles and doubles
- **Different Formats**: Knockout, Round Robin, and Group Stage
- **Random Scores**: Completed matches have realistic scores
- **Mixed Statuses**: Draft, Active, and Completed tournaments
- **Realistic Dates**: Tournaments spread across June-December 2024

### Generated Data

Each tournament includes:
- Random tournament name and location
- Random number of players (4-16)
- Random tournament type (singles/doubles)
- Random format (knockout/round-robin/group)
- Random points to win (11 or 15)
- Random scoring system (rally/traditional)
- Random status (draft/active/completed)
- Generated matches with:
  - Random scores for completed matches
  - In-progress matches with partial scores
  - Upcoming matches ready to start
- Updated participant statistics (wins, losses, points)

### Running the Seed Script

```bash
cd backend
npm run seed
```

This will:
1. Clear all existing data
2. Create an organizer account (organizer@example.com / password123)
3. Generate 10 tournaments with random data
4. Create players/teams for each tournament
5. Generate matches with random scores
6. Update participant statistics

### Sample Output

```
MongoDB Connected
Cleared existing data
Created organizer user
Created tournament 1: Summer Pickleball Championship (singles, knockout, 8 participants)
  Created 8 players
  Created 7 matches
Created tournament 2: Spring Tournament Series (doubles, round-robin, 6 participants)
  Created 12 players and 6 teams
  Created 15 matches
...
✅ Seed data created successfully!
Created 10 tournaments with random data
```

### Tournament Variations

The script generates tournaments with:
- **Singles Tournaments**: 4-16 players
- **Doubles Tournaments**: 4-16 teams (8-32 players total)
- **Knockout Format**: Single elimination brackets
- **Round Robin Format**: Everyone plays everyone
- **Group Stage Format**: 2 groups with round-robin within groups

All matches have realistic scores based on the tournament's `pointsToWin` setting (11 or 15).

