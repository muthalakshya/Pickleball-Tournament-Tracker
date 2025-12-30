import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a player name'],
    trim: true,
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  seed: {
    type: Number,
    default: null,
  },
  // Statistics
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  pointsFor: {
    type: Number,
    default: 0,
  },
  pointsAgainst: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Prevent duplicate player names in the same tournament
playerSchema.index({ tournament: 1, name: 1 }, { unique: true });

const Player = mongoose.model('Player', playerSchema);

export default Player;

