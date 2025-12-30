import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a tournament name'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Please provide a location'],
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date'],
  },
  courts: {
    type: Number,
    required: [true, 'Please provide number of courts'],
    min: 1,
  },
  tournamentType: {
    type: String,
    enum: ['singles', 'doubles'],
    required: [true, 'Please specify tournament type'],
  },
  format: {
    type: String,
    enum: ['group', 'round-robin', 'knockout'],
    required: [true, 'Please specify tournament format'],
  },
  pointsToWin: {
    type: Number,
    enum: [11, 15],
    default: 11,
  },
  scoringSystem: {
    type: String,
    enum: ['rally', 'traditional'],
    default: 'rally',
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft',
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  // For group stage tournaments
  groups: [{
    name: {
      type: String,
      required: true,
    },
    players: [{
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'tournamentTypeRef',
    }],
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    }],
  }],
  // Dynamic ref based on tournament type
  tournamentTypeRef: {
    type: String,
    enum: ['Player', 'Team'],
  },
}, {
  timestamps: true,
});

// Index for faster queries
tournamentSchema.index({ organizer: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ isPublic: 1 });

const Tournament = mongoose.model('Tournament', tournamentSchema);

export default Tournament;

