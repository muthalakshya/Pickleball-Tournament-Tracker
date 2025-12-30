import api from './axios';

export const teamApi = {
  // Get teams for tournament
  getTeams: (tournamentId) => api.get(`/teams/tournament/${tournamentId}`),

  // Create team
  createTeam: (tournamentId, data) => api.post(`/teams/tournament/${tournamentId}`, data),

  // Update team
  updateTeam: (id, data) => api.put(`/teams/${id}`, data),

  // Delete team
  deleteTeam: (id) => api.delete(`/teams/${id}`),
};

