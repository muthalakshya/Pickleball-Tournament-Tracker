import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Public API endpoints
export const publicAPI = {
  // Get all public tournaments
  getTournaments: () => api.get('/public/tournaments'),
  
  // Get single tournament
  getTournament: (id) => api.get(`/public/tournaments/${id}`),
  
  // Get tournament matches
  getTournamentMatches: (id) => api.get(`/public/tournaments/${id}/matches`),
  
  // Get tournament standings
  getTournamentStandings: (id) => api.get(`/public/tournaments/${id}/standings`),
  
  // Get tournament group standings
  getTournamentGroupStandings: (id) => api.get(`/public/tournaments/${id}/group-standings`),
}

// Admin API endpoints
export const adminAPI = {
  // Authentication
  login: (email, password) => api.post('/admin/login', { email, password }),
  
  // Tournaments
  getTournaments: () => api.get('/admin/tournaments'),
  getCustomTournaments: () => api.get('/admin/tournaments/custom'),
  getTournament: (id) => api.get(`/admin/tournaments/${id}`),
  createTournament: (data) => api.post('/admin/tournaments', data),
  updateTournament: (id, data) => api.put(`/admin/tournaments/${id}`, data),
  deleteTournament: (id) => api.delete(`/admin/tournaments/${id}`),
  updateTournamentStatus: (id, data) => api.patch(`/admin/tournaments/${id}/status`, data),
  toggleTournamentPublic: (id) => api.patch(`/admin/tournaments/${id}/toggle-public`),
  
  // Participants
  getTournamentParticipants: (tournamentId) => api.get(`/admin/tournaments/${tournamentId}/participants`),
  createParticipant: (tournamentId, data) => api.post(`/admin/tournaments/${tournamentId}/participants`, data),
  deleteParticipant: (tournamentId, participantId) => api.delete(`/admin/tournaments/${tournamentId}/participants/${participantId}`),
  uploadParticipants: (tournamentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/admin/tournaments/${tournamentId}/upload-participants`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Fixtures
  generateFixtures: (tournamentId, options) => api.post(`/admin/tournaments/${tournamentId}/generate-fixtures`, options),
  createCustomRound: (tournamentId, data) => api.post(`/admin/tournaments/${tournamentId}/custom-round`, data),
  getCustomRounds: (tournamentId) => api.get(`/admin/tournaments/${tournamentId}/custom-rounds`),
  generateGroupTournament: (tournamentId, data) => api.post(`/admin/tournaments/${tournamentId}/generate-group-tournament`, data),
  generateKnockoutRounds: (tournamentId, data) => api.post(`/admin/tournaments/${tournamentId}/generate-knockout-rounds`, data),
  getGroupStandings: (tournamentId) => api.get(`/admin/tournaments/${tournamentId}/group-standings`),
  
  // Matches
  getTournamentMatches: (tournamentId) => api.get(`/admin/tournaments/${tournamentId}/matches`),
  getMatch: (id) => api.get(`/admin/matches/${id}`),
  createMatch: (data) => api.post('/admin/matches', data),
  updateMatch: (id, data) => api.put(`/admin/matches/${id}`, data),
  updateMatchScore: (id, data) => api.put(`/admin/matches/${id}/score`, data),
  completeMatch: (id, data) => api.post(`/admin/matches/${id}/complete`, data),
  deleteMatch: (id) => api.delete(`/admin/matches/${id}`),
  cancelMatch: (id) => api.post(`/admin/matches/${id}/cancel`),
}

export default api

