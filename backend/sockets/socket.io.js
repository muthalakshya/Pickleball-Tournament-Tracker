/**
 * Socket.IO Server Setup
 * 
 * This file sets up Socket.IO for real-time communication.
 * Handles public connections for live tournament updates.
 * 
 * Events emitted:
 * - tournament_live: Tournament status changed to live
 * - match_started: Match status changed to live
 * - score_updated: Match score was updated
 * - match_completed: Match was completed
 */

import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO Server
 * 
 * Sets up Socket.IO with CORS configuration for public access.
 * 
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
export const initializeSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*', // Allow all origins for public access
      methods: ['GET', 'POST'],
      credentials: false
    },
    // Allow public connections without authentication
    allowEIO3: true
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`📡 Client connected: ${socket.id}`);

    // Handle tournament room subscriptions
    // Clients can join specific tournament rooms to receive updates
    socket.on('subscribe_tournament', (tournamentId) => {
      if (tournamentId) {
        socket.join(`tournament:${tournamentId}`);
        console.log(`📥 Client ${socket.id} subscribed to tournament ${tournamentId}`);
      }
    });

    // Handle tournament room unsubscriptions
    socket.on('unsubscribe_tournament', (tournamentId) => {
      if (tournamentId) {
        socket.leave(`tournament:${tournamentId}`);
        console.log(`📤 Client ${socket.id} unsubscribed from tournament ${tournamentId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`📡 Client disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO Instance
 * 
 * Returns the initialized Socket.IO instance.
 * 
 * @returns {Object|null} Socket.IO server instance or null if not initialized
 */
export const getIO = () => {
  return io;
};

/**
 * Emit Event to Tournament Room
 * 
 * Emits an event to all clients subscribed to a specific tournament.
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToTournament = (tournamentId, event, data) => {
  if (io) {
    io.to(`tournament:${tournamentId}`).emit(event, data);
    console.log(`📢 Emitted ${event} to tournament ${tournamentId}`);
  }
};

/**
 * Emit Event to All Clients
 * 
 * Emits an event to all connected clients.
 * 
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    console.log(`📢 Emitted ${event} to all clients`);
  }
};

