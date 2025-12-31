/**
 * Match Model
 * 
 * This model defines the schema for tournament matches.
 * Designed for public viewing with indexes optimized for common queries:
 * - Live matches in a tournament
 * - Upcoming matches
 * - Match history
 * - Court assignments
 */

import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
      // Index for fetching all matches in a tournament (very common query)
      index: true
    },
    round: {
      type: String,
      required: [true, 'Match round is required'],
      trim: true,
      // Examples: "Group A", "Group B", "Quarter Finals", "Semi Finals", "Final", "Round 1"
      maxlength: [100, 'Round name cannot exceed 100 characters']
    },
    participantA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: false, // Can be null for TBD (To Be Declared) in knockout brackets
      default: null
    },
    participantB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: false, // Can be null for TBD (To Be Declared) in knockout brackets
      default: null
    },
    score: {
      a: {
        type: Number,
        default: 0,
        min: [0, 'Score cannot be negative']
      },
      b: {
        type: Number,
        default: 0,
        min: [0, 'Score cannot be negative']
      }
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'completed', 'cancelled'],
      default: 'upcoming',
      required: true,
      // Index for filtering by status (very common public query)
      index: true
    },
    courtNumber: {
      type: Number,
      min: [1, 'Court number must be at least 1'],
      default: null,
      // Index for filtering matches by court (useful for live viewing)
      sparse: true // Sparse index: only indexes documents with courtNumber
    },
    order: {
      type: Number,
      min: [0, 'Order cannot be negative'],
      default: 0,
      // Used for ordering matches within a round
      // Index for sorting matches in correct order
      index: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    versionKey: false
  }
);

// Compound indexes for common query patterns

// Index for fetching live matches in a tournament (most common live viewing query)
matchSchema.index({ tournamentId: 1, status: 1 });

// Index for fetching upcoming matches (common public query)
matchSchema.index({ tournamentId: 1, status: 1, order: 1 });

// Index for fetching completed matches (for match history)
matchSchema.index({ tournamentId: 1, status: 1, createdAt: -1 });

// Index for court-based queries (useful for live court viewing)
matchSchema.index({ courtNumber: 1, status: 1 });

// Index for round-based queries (fetching all matches in a round)
matchSchema.index({ tournamentId: 1, round: 1, order: 1 });

// Index for sorting matches by creation/start time
matchSchema.index({ createdAt: 1 });

// Virtual to determine match winner (useful for public viewing)
matchSchema.virtual('winner').get(function () {
  if (this.status !== 'completed') {
    return null;
  }
  if (this.score.a > this.score.b) {
    return 'A';
  } else if (this.score.b > this.score.a) {
    return 'B';
  }
  return 'draw'; // Handle tie scenarios if applicable
});

// Virtual to check if match is in progress
matchSchema.virtual('isLive').get(function () {
  return this.status === 'live';
});

// Ensure virtuals are included in JSON output
matchSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Match = mongoose.model('Match', matchSchema);

export default Match;

