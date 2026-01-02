/**
 * Participant Controller
 * 
 * This file contains controller functions for participant management,
 * including bulk upload functionality for CSV and Excel files.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import Tournament from '../models/tournament.model.js';
import Participant from '../models/participant.model.js';
import Match from '../models/match.model.js';
import { deleteUploadedFile } from '../middlewares/upload.middleware.js';

/**
 * Parse CSV File
 * 
 * Reads and parses a CSV file, returning an array of participant data.
 * Expected CSV format:
 * - For singles: name,player1
 * - For doubles: name,player1,player2
 * 
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Array of participant objects
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Trim all values and filter out empty rows
        const row = {};
        Object.keys(data).forEach(key => {
          const value = data[key]?.trim();
          if (value) row[key.trim()] = value;
        });
        
        if (Object.keys(row).length > 0) {
          results.push(row);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Parse Excel File
 * 
 * Reads and parses an Excel file (.xlsx, .xls), returning an array of participant data.
 * Expected Excel format (first row should be headers):
 * - For singles: name, player1
 * - For doubles: name, player1, player2
 * 
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Array>} Array of participant objects
 */
const parseExcel = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Clean up data: trim values and remove empty rows
    return data
      .map(row => {
        const cleaned = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value !== null && value !== undefined) {
            const trimmed = String(value).trim();
            if (trimmed) cleaned[key.trim()] = trimmed;
          }
        });
        return cleaned;
      })
      .filter(row => Object.keys(row).length > 0);
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse Uploaded File
 * 
 * Determines file type and parses accordingly.
 * 
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<Array>} Array of participant objects
 */
const parseFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.csv') {
    return await parseCSV(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return await parseExcel(filePath);
  } else {
    throw new Error('Unsupported file format. Only CSV and Excel files are supported.');
  }
};

/**
 * Validate and Transform Participant Data
 * 
 * Validates participant data based on tournament type and transforms
 * it into the format expected by the Participant model.
 * 
 * @param {Array} rawData - Raw data from file
 * @param {string} tournamentType - 'singles' or 'doubles'
 * @returns {Object} Object with valid participants and errors
 */
const validateAndTransformParticipants = (rawData, tournamentType) => {
  const validParticipants = [];
  const errors = [];
  const seenNames = new Set();

  rawData.forEach((row, index) => {
    const lineNumber = index + 2; // +2 because line 1 is header, and arrays are 0-indexed
    
    try {
      // Extract data (case-insensitive column matching)
      const name = row.name || row.Name || row.NAME || row['Participant Name'] || row['Team Name'];
      const player1 = row.player1 || row.Player1 || row.PLAYER1 || row['Player 1'] || row['Player1'];
      const player2 = row.player2 || row.Player2 || row.PLAYER2 || row['Player 2'] || row['Player2'];

      // Validation: Name is required
      if (!name || !name.trim()) {
        errors.push(`Line ${lineNumber}: Participant name is required`);
        return;
      }

      const trimmedName = name.trim();

      // Validation: Check for duplicate names
      if (seenNames.has(trimmedName.toLowerCase())) {
        errors.push(`Line ${lineNumber}: Duplicate participant name "${trimmedName}"`);
        return;
      }
      seenNames.add(trimmedName.toLowerCase());

      // Validation: Player 1 is required
      if (!player1 || !player1.trim()) {
        errors.push(`Line ${lineNumber}: Player 1 is required for participant "${trimmedName}"`);
        return;
      }

      const players = [player1.trim()];

      // Validation: For doubles, player 2 is required
      if (tournamentType === 'doubles') {
        if (!player2 || !player2.trim()) {
          errors.push(`Line ${lineNumber}: Player 2 is required for doubles tournament. Participant: "${trimmedName}"`);
          return;
        }
        players.push(player2.trim());
      } else if (tournamentType === 'singles' && player2) {
        // Warn if player2 is provided for singles (but don't error)
        // We'll just ignore player2 for singles
      }

      // Create participant object
      validParticipants.push({
        name: trimmedName,
        players: players
      });
    } catch (error) {
      errors.push(`Line ${lineNumber}: Error processing row - ${error.message}`);
    }
  });

  return { validParticipants, errors };
};

/**
 * Get Tournament Participants
 * 
 * Retrieves all participants for a specific tournament.
 * Only the tournament creator can view participants.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTournamentParticipants = async (req, res) => {
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
        message: 'You do not have permission to view participants for this tournament'
      });
    }

    // Get all participants for this tournament
    const participants = await Participant.find({ tournamentId: id })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        tournament: {
          id: tournament._id,
          name: tournament.name,
          type: tournament.type
        },
        participants: participants,
        count: participants.length
      }
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching participants',
      error: error.message
    });
  }
};

/**
 * Upload Participants (Bulk Upload)
 * 
 * Handles bulk upload of participants via CSV or Excel file.
 * 
 * Features:
 * - Supports CSV and Excel formats
 * - Validates participant data based on tournament type
 * - Checks for duplicate names
 * - Enforces minimum participant count
 * - Auto-creates participants in database
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadParticipants = async (req, res) => {
  let filePath = null;

  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a CSV or Excel file.'
      });
    }

    filePath = req.file.path;

    // Find tournament and verify ownership
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      deleteUploadedFile(filePath);
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Verify admin owns this tournament
    const adminId = req.admin.id.toString();
    const tournamentCreatorId = tournament.createdBy.toString();
    
    if (tournamentCreatorId !== adminId) {
      deleteUploadedFile(filePath);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload participants for this tournament'
      });
    }

    // Parse uploaded file
    let rawData;
    try {
      rawData = await parseFile(filePath);
    } catch (parseError) {
      deleteUploadedFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse file',
        error: parseError.message
      });
    }

    // Validation: Check if file has data
    if (!rawData || rawData.length === 0) {
      deleteUploadedFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'File is empty or contains no valid data'
      });
    }

    // Validate and transform participant data
    const { validParticipants, errors } = validateAndTransformParticipants(
      rawData,
      tournament.type
    );

    // Validation: Check for parsing errors
    if (errors.length > 0) {
      deleteUploadedFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'File validation errors',
        errors: errors,
        validCount: validParticipants.length,
        errorCount: errors.length
      });
    }

    // Validation: Minimum participants (at least 2 for any tournament)
    const MIN_PARTICIPANTS = 2;
    if (validParticipants.length < MIN_PARTICIPANTS) {
      deleteUploadedFile(filePath);
      return res.status(400).json({
        success: false,
        message: `Tournament requires at least ${MIN_PARTICIPANTS} participants. Found ${validParticipants.length}.`
      });
    }

    // Check for existing participants with same names in this tournament
    const existingParticipants = await Participant.find({ tournamentId: id });
    const existingNames = new Set(
      existingParticipants.map(p => p.name.toLowerCase())
    );

    const duplicateNames = validParticipants.filter(p =>
      existingNames.has(p.name.toLowerCase())
    );

    if (duplicateNames.length > 0) {
      deleteUploadedFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'Duplicate participant names found in tournament',
        duplicates: duplicateNames.map(p => p.name)
      });
    }

    // Create participants in database
    const participantsToCreate = validParticipants.map(participant => ({
      name: participant.name,
      players: participant.players,
      tournamentId: id
    }));

    const createdParticipants = await Participant.insertMany(participantsToCreate);

    // Clean up uploaded file
    deleteUploadedFile(filePath);

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdParticipants.length} participants`,
      data: {
        count: createdParticipants.length,
        participants: createdParticipants,
        tournament: {
          id: tournament._id,
          name: tournament.name,
          type: tournament.type
        }
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath) {
      deleteUploadedFile(filePath);
    }

    console.error('Error uploading participants:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading participants',
      error: error.message
    });
  }
};

/**
 * Create Single Participant
 * 
 * Creates a single participant manually (via form).
 * Useful for adding participants one at a time.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, players } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    // Validation: Required fields
    if (!name || !players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name and at least one player are required'
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
        message: 'You do not have permission to add participants to this tournament'
      });
    }

    // Validation: Tournament type vs players
    if (tournament.type === 'doubles' && players.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Doubles tournaments require exactly 2 players'
      });
    }

    if (tournament.type === 'singles' && players.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Singles tournaments can only have 1 player per participant'
      });
    }

    // Check for duplicate name
    const existingParticipant = await Participant.findOne({
      tournamentId: id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: `Participant with name "${name}" already exists in this tournament`
      });
    }

    // Create participant
    const participant = new Participant({
      name: name.trim(),
      players: players.map(p => p.trim()).filter(p => p),
      tournamentId: id
    });

    await participant.save();

    res.status(201).json({
      success: true,
      message: 'Participant created successfully',
      data: {
        participant: participant,
        tournament: {
          id: tournament._id,
          name: tournament.name,
          type: tournament.type
        }
      }
    });
  } catch (error) {
    console.error('Error creating participant:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating participant',
      error: error.message
    });
  }
};

/**
 * Delete Participant
 * 
 * Deletes a participant from a tournament. Only the admin who created the tournament can delete participants.
 * 
 * Business Rules:
 * - Cannot delete participant if they are in any matches (completed, live, or upcoming)
 * - Prevents breaking tournament integrity
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteParticipant = async (req, res) => {
  try {
    const { id, participantId } = req.params;

    // Validate MongoDB ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid participant ID format'
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
        message: 'You do not have permission to delete participants from this tournament'
      });
    }

    // Find participant
    const participant = await Participant.findOne({
      _id: participantId,
      tournamentId: id
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this tournament'
      });
    }

    // Check if participant is in any matches
    const matchesWithParticipant = await Match.find({
      tournamentId: id,
      $or: [
        { participantA: participantId },
        { participantB: participantId }
      ]
    });

    if (matchesWithParticipant.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete participant. They are involved in ${matchesWithParticipant.length} match(es). Please delete or update those matches first.`,
        matchesCount: matchesWithParticipant.length
      });
    }

    // Delete participant
    await Participant.findByIdAndDelete(participantId);

    res.status(200).json({
      success: true,
      message: 'Participant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting participant',
      error: error.message
    });
  }
};

