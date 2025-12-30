import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  round: {
    type: String,
    required: true,
    enum: ['group', 'round-robin', 'quarterfinal', 'semifinal', 'final', 'third-place'],
  },
  group: {
    type: String,
    default: null, // For group stage matches
  },
  matchNumber: {
    type: Number,
    required: true,
  },
  // For singles
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null,
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null,
  },
  // For doubles
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  // Scores
  score1: {
    type: Number,
    default: 0,
  },
  score2: {
    type: Number,
    default: 0,
  },
  // Sets (for traditional scoring)
  sets: [{
    score1: Number,
    score2: Number,
  }],
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'bye'],
    default: 'upcoming',
  },
  court: {
    type: Number,
    default: null,
  },
  scheduledTime: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'winnerModel',
    default: null,
  },
  winnerModel: {
    type: String,
    enum: ['Player', 'Team'],
    default: null,
  },
  // For knockout progression
  nextMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null,
  },
  nextMatchPosition: {
    type: String,
    enum: ['player1', 'player2', 'team1', 'team2'],
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
matchSchema.index({ tournament: 1, round: 1 });
matchSchema.index({ tournament: 1, status: 1 });
matchSchema.index({ tournament: 1, court: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;

