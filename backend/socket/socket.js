/**
 * Socket.IO setup and event handlers
 * Handles real-time updates for tournament matches
 */

export const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join tournament room
    socket.on('join_tournament', (tournamentId) => {
      socket.join(`tournament-${tournamentId}`);
      console.log(`Socket ${socket.id} joined tournament ${tournamentId}`);
    });

    // Leave tournament room
    socket.on('leave_tournament', (tournamentId) => {
      socket.leave(`tournament-${tournamentId}`);
      console.log(`Socket ${socket.id} left tournament ${tournamentId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Emit events are handled in controllers via req.app.locals.io
  // Events emitted:
  // - match_started: When a match is started
  // - score_updated: When match score is updated
  // - match_completed: When a match is completed
  // - match_updated: When any match property is updated
};

