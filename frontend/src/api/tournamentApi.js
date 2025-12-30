import api from './axios';

export const tournamentApi = {
  // Get all tournaments
  getTournaments: () => api.get('/tournaments'),

  // Get single tournament
  getTournament: (id) => api.get(`/tournaments/${id}`),

  // Create tournament
  createTournament: (data) => api.post('/tournaments', data),

  // Update tournament
  updateTournament: (id, data) => api.put(`/tournaments/${id}`, data),

  // Delete tournament
  deleteTournament: (id) => api.delete(`/tournaments/${id}`),

  // Generate fixtures
  generateFixtures: (id) => api.post(`/tournaments/${id}/generate-fixtures`),
};

