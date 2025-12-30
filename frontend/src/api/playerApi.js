import api from './axios';

export const playerApi = {
  // Get players for tournament
  getPlayers: (tournamentId) => api.get(`/players/tournament/${tournamentId}`),

  // Create player
  createPlayer: (tournamentId, data) => api.post(`/players/tournament/${tournamentId}`, data),

  // Bulk create players
  bulkCreatePlayers: (tournamentId, data) => api.post(`/players/tournament/${tournamentId}/bulk`, data),

  // Update player
  updatePlayer: (id, data) => api.put(`/players/${id}`, data),

  // Delete player
  deletePlayer: (id) => api.delete(`/players/${id}`),
};

