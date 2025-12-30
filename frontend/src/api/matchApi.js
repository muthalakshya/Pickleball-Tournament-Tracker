import api from './axios';

export const matchApi = {
  // Get matches for tournament
  getMatches: (tournamentId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/matches/tournament/${tournamentId}${queryString ? `?${queryString}` : ''}`);
  },

  // Get single match
  getMatch: (id) => api.get(`/matches/${id}`),

  // Update match
  updateMatch: (id, data) => api.put(`/matches/${id}`, data),

  // Update score
  updateScore: (id, data) => api.put(`/matches/${id}/score`, data),

  // Start match
  startMatch: (id, data) => api.put(`/matches/${id}/start`, data),

  // Complete match
  completeMatch: (id) => api.put(`/matches/${id}/complete`),
};

