import api from './axios';

export const authApi = {
  // Register
  register: (data) => api.post('/auth/register', data),

  // Login
  login: (data) => api.post('/auth/login', data),

  // Get current user
  getMe: () => api.get('/auth/me'),
};

