# Socket.IO Integration

This directory contains Socket.IO setup for real-time tournament updates.

## Events

### Public Events (No Authentication Required)

All events are broadcast to clients subscribed to specific tournament rooms.

#### 1. `tournament_live`
Emitted when a tournament status changes to "live".

**Event Data:**
```json
{
  "tournamentId": "tournament_id",
  "tournament": {
    "id": "...",
    "name": "Summer Tournament 2024",
    "status": "live",
    "format": "knockout",
    "type": "doubles"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 2. `match_started`
Emitted when a match status changes to "live".

**Event Data:**
```json
{
  "matchId": "match_id",
  "match": {
    "id": "...",
    "round": "Quarter Finals",
    "participantA": {...},
    "participantB": {...},
    "status": "live",
    "courtNumber": 1
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 3. `score_updated`
Emitted when a match score is updated.

**Event Data:**
```json
{
  "matchId": "match_id",
  "match": {
    "id": "...",
    "round": "Quarter Finals",
    "participantA": {...},
    "participantB": {...},
    "score": {
      "a": 11,
      "b": 9
    },
    "status": "live"
  },
  "score": {
    "a": 11,
    "b": 9
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 4. `match_completed`
Emitted when a match is completed.

**Event Data:**
```json
{
  "matchId": "match_id",
  "match": {
    "id": "...",
    "round": "Quarter Finals",
    "participantA": {...},
    "participantB": {...},
    "score": {
      "a": 11,
      "b": 9
    },
    "status": "completed"
  },
  "winner": {
    "id": "...",
    "name": "Team A",
    "players": ["John", "Jane"]
  },
  "progression": {
    "matchCompleted": true,
    "roundComplete": true,
    "nextRoundGenerated": true,
    "tournamentComplete": false,
    "updatedRounds": ["Semi Finals"]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Client Usage

### JavaScript/TypeScript Example

```javascript
import { io } from 'socket.io-client';

// Connect to Socket.IO server
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});

// Subscribe to a tournament
socket.emit('subscribe_tournament', 'tournament_id_here');

// Listen for tournament live event
socket.on('tournament_live', (data) => {
  console.log('Tournament is now live:', data.tournament);
  // Update UI to show tournament is live
});

// Listen for match started event
socket.on('match_started', (data) => {
  console.log('Match started:', data.match);
  // Update UI to show match is live
});

// Listen for score updates
socket.on('score_updated', (data) => {
  console.log('Score updated:', data.score);
  // Update match score in UI
  updateMatchScore(data.matchId, data.score);
});

// Listen for match completed
socket.on('match_completed', (data) => {
  console.log('Match completed:', data.match);
  console.log('Winner:', data.winner);
  console.log('Progression:', data.progression);
  // Update UI to show match result
  // If next round generated, update bracket
});

// Unsubscribe from tournament
socket.emit('unsubscribe_tournament', 'tournament_id_here');

// Disconnect
socket.disconnect();
```

### React Example

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function TournamentLiveView({ tournamentId }) {
  const [match, setMatch] = useState(null);
  const [score, setScore] = useState({ a: 0, b: 0 });

  useEffect(() => {
    const socket = io('http://localhost:3000');
    
    // Subscribe to tournament
    socket.emit('subscribe_tournament', tournamentId);

    // Listen for events
    socket.on('match_started', (data) => {
      setMatch(data.match);
    });

    socket.on('score_updated', (data) => {
      setScore(data.score);
      setMatch(data.match);
    });

    socket.on('match_completed', (data) => {
      setMatch(data.match);
      // Show winner notification
    });

    return () => {
      socket.emit('unsubscribe_tournament', tournamentId);
      socket.disconnect();
    };
  }, [tournamentId]);

  return (
    <div>
      {match && (
        <div>
          <h3>{match.round}</h3>
          <p>{match.participantA.name} vs {match.participantB.name}</p>
          <p>Score: {score.a} - {score.b}</p>
        </div>
      )}
    </div>
  );
}
```

## Server-Side Events

Events are automatically emitted from:
- `admin.controller.js` - When tournament status changes to live
- `match.controller.js` - When match scores/status are updated

No additional code needed - events are emitted automatically!

