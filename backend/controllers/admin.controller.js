/**
 * Admin Tournament Controller
 * 
 * This file contains controller functions for admin-only tournament management.
 * All endpoints require authentication via authenticateAdmin middleware.
 * 
 * Features:
 * - Create tournaments (always as draft)
 * - Update tournaments (rules only editable in draft)
 * - Delete tournaments (prevent deleting live tournaments)
 * - Update tournament status (draft -> live -> completed)
 */

import mongoose from 'mongoose';
import Tournament from '../models/tournament.model.js';
import Match from '../models/match.model.js';
import { emitTournamentLive } from '../services/socket.service.js';

/**
 * Create Tournament
 * 
 * Creates a new tournament. Always creates as draft status.
 * Admin ID is automatically set from authenticated admin.
 * 
 * Validation:
 * - All required fields must be provided
 * - Tournament type must be 'singles' or 'doubles'
 * - Format must be 'group', 'roundRobin', or 'knockout'
 * - Points must be 11 or 15
 * - Scoring system must be 'rally' or 'pickleball'
 * 
 * @param {Object} req - Express request object (req.admin contains authenticated admin info)
 * @param {Object} res - Express response object
 */
export const createTournament = async (req, res) => {
  try {
    const { name, type, format, rules, currentRound, isPublic } = req.body;

    // Validation: Required fields
    if (!name || !type || !format) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and format are required fields'
      });
    }

    // Validation: Tournament type
    if (!['singles', 'doubles'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tournament type must be either "singles" or "doubles"'
      });
    }

    // Validation: Tournament format
    if (!['group', 'roundRobin', 'knockout'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Tournament format must be "group", "roundRobin", or "knockout"'
      });
    }

    // Validation: Rules (if provided)
    if (rules) {
      if (rules.points && ![11, 15].includes(rules.points)) {
        return res.status(400).json({
          success: false,
          message: 'Points must be either 11 or 15'
        });
      }

      if (rules.scoringSystem && !['rally', 'pickleball'].includes(rules.scoringSystem)) {
        return res.status(400).json({
          success: false,
          message: 'Scoring system must be either "rally" or "pickleball"'
        });
      }
    }

    // Create tournament (always as draft)
    const tournament = new Tournament({
      name: name.trim(),
      type,
      format,
      rules: {
        points: rules?.points || 11,
        scoringSystem: rules?.scoringSystem || 'rally'
      },
      status: 'draft', // Always create as draft
      currentRound: currentRound?.trim() || null,
      createdBy: req.admin.id, // Set from authenticated admin
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await tournament.save();

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: tournament
    });
  } catch (error) {
    console.error('Error creating tournament:', error);

    // Handle duplicate name or validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating tournament',
      error: error.message
    });
  }
};

/**
 * Update Tournament
 * 
 * Updates an existing tournament. Only the admin who created it can update it.
 * 
 * Business Rules:
 * - Rules can only be edited when tournament is in 'draft' status
 * - Other fields can be updated in any status
 * - Status cannot be changed via this endpoint (use PATCH /status)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, format, rules, currentRound, isPublic } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    // Convert both ObjectIds to strings for reliable comparison
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this tournament'
      });
    }

    // Validation: Rules can only be edited in draft status
    if (rules && tournament.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Tournament rules can only be edited when tournament is in draft status'
      });
    }

    // Validation: Type and format (if provided)
    if (type && !['singles', 'doubles'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tournament type must be either "singles" or "doubles"'
      });
    }

    if (format && !['group', 'roundRobin', 'knockout'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Tournament format must be "group", "roundRobin", or "knockout"'
      });
    }

    // Validation: Rules (if provided and tournament is draft)
    if (rules && tournament.status === 'draft') {
      if (rules.points && ![11, 15].includes(rules.points)) {
        return res.status(400).json({
          success: false,
          message: 'Points must be either 11 or 15'
        });
      }

      if (rules.scoringSystem && !['rally', 'pickleball'].includes(rules.scoringSystem)) {
        return res.status(400).json({
          success: false,
          message: 'Scoring system must be either "rally" or "pickleball"'
        });
      }
    }

    // Update allowed fields
    if (name !== undefined) tournament.name = name.trim();
    if (type !== undefined) tournament.type = type;
    if (format !== undefined) tournament.format = format;
    if (currentRound !== undefined) tournament.currentRound = currentRound?.trim() || null;
    if (isPublic !== undefined) tournament.isPublic = isPublic;

    // Update rules only if tournament is draft
    if (rules && tournament.status === 'draft') {
      if (rules.points !== undefined) tournament.rules.points = rules.points;
      if (rules.scoringSystem !== undefined) tournament.rules.scoringSystem = rules.scoringSystem;
    }

    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Tournament updated successfully',
      data: tournament
    });
  } catch (error) {
    console.error('Error updating tournament:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating tournament',
      error: error.message
    });
  }
};

/**
 * Delete Tournament
 * 
 * Deletes a tournament. Only the admin who created it can delete it.
 * 
 * Business Rules:
 * - Live tournaments cannot be deleted (must be completed or draft)
 * - Prevents accidental deletion of active tournaments
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    // Convert both ObjectIds to strings for reliable comparison
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this tournament'
      });
    }

    // Validation: Prevent deleting live tournaments
    if (tournament.status === 'live') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a live tournament. Please complete or cancel it first.'
      });
    }

    // Check if tournament has matches (optional: warn or prevent deletion)
    const matchCount = await Match.countDocuments({ tournamentId: id });
    if (matchCount > 0) {
      // Optionally, we could prevent deletion if matches exist
      // For now, we'll allow deletion but warn about cascading effects
      // In production, you might want to implement soft delete or cascade deletion
    }

    // Delete tournament
    await Tournament.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tournament',
      error: error.message
    });
  }
};

/**
 * Get All Tournaments (Admin)
 * 
 * Gets all tournaments created by the authenticated admin.
 * Returns all tournaments regardless of isPublic status.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllTournaments = async (req, res) => {
  try {
    // Get all tournaments created by this admin
    const tournaments = await Tournament.find({ createdBy: req.admin.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: tournaments,
      count: tournaments.length
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournaments',
      error: error.message
    });
  }
};

/**
 * Get Tournament by ID
 * 
 * Gets a single tournament by ID. Only the admin who created it can view it.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTournament = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    // Convert both ObjectIds to strings for reliable comparison
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      console.log('Ownership check failed:', {
        adminId,
        tournamentCreatorId,
        tournamentId: id
      });
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this tournament'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournament',
      error: error.message
    });
  }
};

/**
 * Update Tournament Status
 * 
 * Updates the status of a tournament. Only the admin who created it can update status.
 * 
 * Allowed Status Transitions:
 * - draft -> live
 * - live -> completed
 * - completed -> (no further transitions)
 * 
 * Business Rules:
 * - Status can only progress forward (draft -> live -> completed)
 * - Cannot revert to previous status
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTournamentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Validation: Status is required
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validation: Status must be valid enum value
    if (!['draft', 'live', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "draft", "live", or "completed"'
      });
    }

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    // Convert both ObjectIds to strings for reliable comparison
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this tournament'
      });
    }

    // Validation: Status transition rules
    const currentStatus = tournament.status;
    
    if (currentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a completed tournament'
      });
    }

    if (currentStatus === 'live' && status === 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot revert a live tournament back to draft status'
      });
    }

    if (currentStatus === 'draft' && status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark a draft tournament as completed. Tournament must be live first.'
      });
    }

    // Update status
    tournament.status = status;

    // Optionally update currentRound when going live
    if (status === 'live' && !tournament.currentRound) {
      tournament.currentRound = 'Group Stage'; // Default round name
    }

    await tournament.save();

    // Emit socket event if tournament is going live
    if (status === 'live') {
      try {
        await emitTournamentLive(tournament._id, tournament.toObject());
      } catch (error) {
        console.error('Error emitting tournament_live event:', error);
        // Don't fail the request if socket emission fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Tournament status updated to ${status}`,
      data: tournament
    });
  } catch (error) {
    console.error('Error updating tournament status:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating tournament status',
      error: error.message
    });
  }
};

/**
 * Toggle Tournament Public Status
 * 
 * Toggles the isPublic status of a tournament (publish/unpublish).
 * Only the admin who created it can toggle this.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const toggleTournamentPublic = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this tournament'
      });
    }

    // Toggle isPublic status
    tournament.isPublic = !tournament.isPublic;
    await tournament.save();

    res.status(200).json({
      success: true,
      message: tournament.isPublic 
        ? 'Tournament published successfully' 
        : 'Tournament unpublished successfully',
      data: tournament
    });
  } catch (error) {
    console.error('Error toggling tournament public status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tournament public status',
      error: error.message
    });
  }
};

