import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a team name'],
    trim: true,
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
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

// Prevent duplicate team names in the same tournament
teamSchema.index({ tournament: 1, name: 1 }, { unique: true });

// Ensure player1 and player2 are different
teamSchema.pre('save', function (next) {
  if (this.player1.toString() === this.player2.toString()) {
    next(new Error('A team must have two different players'));
  } else {
    next();
  }
});

const Team = mongoose.model('Team', teamSchema);

export default Team;

