/**
 * Participant Model
 * 
 * This model defines the schema for tournament participants (players/teams).
 * For singles tournaments, participants have one player.
 * For doubles tournaments, participants have two players.
 * 
 * Optimized for public viewing with indexes on tournamentId for fast lookups.
 */

import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
      maxlength: [200, 'Participant name cannot exceed 200 characters']
    },
    players: {
      type: [String],
      required: [true, 'At least one player is required'],
      validate: {
        validator: function (players) {
          // For singles: exactly 1 player, for doubles: exactly 2 players
          // Validation will be done at application level based on tournament type
          return players.length > 0 && players.length <= 2;
        },
        message: 'Participants must have 1-2 players'
      }
      // Note: Individual player names should be trimmed at application level
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
      // Index for fast lookups of all participants in a tournament (very common query)
      index: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    versionKey: false
  }
);

// Compound index for tournament participant lookups
// Essential for fetching all participants of a specific tournament
participantSchema.index({ tournamentId: 1, createdAt: 1 });

// Index for searching participants by name (useful for public search)
participantSchema.index({ name: 'text' });

// Virtual to get player count (useful for determining singles vs doubles)
participantSchema.virtual('playerCount').get(function () {
  return this.players.length;
});

// Ensure virtuals are included in JSON output
participantSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Participant = mongoose.model('Participant', participantSchema);

export default Participant;

