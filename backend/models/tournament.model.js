/**
 * Tournament Model
 * 
 * This model defines the schema for pickleball tournaments.
 * Designed with public viewing in mind, so indexes are optimized
 * for common queries like fetching live tournaments, filtering by type, etc.
 */

import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
      maxlength: [200, 'Tournament name cannot exceed 200 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    date: {
      type: Date,
      // Tournament date/start date
    },
    type: {
      type: String,
      enum: ['singles', 'doubles'],
      required: [true, 'Tournament type is required'],
      // Index for filtering by type (common public query)
      index: true
    },
    format: {
      type: String,
      enum: ['group', 'roundRobin', 'knockout', 'custom'],
      required: [true, 'Tournament format is required']
    },
    rules: {
      points: {
        type: Number,
        enum: [11, 15],
        default: 11,
        required: true
      },
      scoringSystem: {
        type: String,
        enum: ['rally', 'pickleball'],
        default: 'rally',
        required: true
      }
    },
    status: {
      type: String,
      enum: ['draft', 'comingSoon', 'live', 'delayed', 'completed', 'cancelled'],
      default: 'draft',
      required: true,
      // Index for filtering live/completed tournaments (very common public query)
      index: true
    },
    currentRound: {
      type: String,
      trim: true,
      // Examples: "Group Stage", "Quarter Finals", "Semi Finals", "Final", "Round 1"
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Tournament creator is required']
    },
    isPublic: {
      type: Boolean,
      default: true,
      // Index for filtering public tournaments (essential for public viewing)
      index: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    versionKey: false
  }
);

// Compound indexes for common query patterns
// Index for fetching public live tournaments (most common public query)
tournamentSchema.index({ isPublic: 1, status: 1 });

// Index for filtering by type and status (common combination)
tournamentSchema.index({ type: 1, status: 1 });

// Index for admin queries (fetching tournaments by creator)
tournamentSchema.index({ createdBy: 1, status: 1 });

// Index for sorting by creation date (newest tournaments first)
tournamentSchema.index({ createdAt: -1 });

// Virtual for getting tournament URL (useful for public viewing)
tournamentSchema.virtual('url').get(function () {
  return `/tournaments/${this._id}`;
});

// Ensure virtuals are included in JSON output
tournamentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

export default Tournament;

