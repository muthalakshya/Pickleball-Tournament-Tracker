import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('admin_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if token exists and validate it
    if (token) {
      // Set token in axios defaults
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // You could add a token validation endpoint here
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    try {
      const response = await api.post('/admin/login', { email, password })
      const { token: newToken, admin: adminData } = response.data
      
      if (!newToken || !adminData) {
        return {
          success: false,
          message: 'Invalid response from server'
        }
      }
      
      // Store token
      localStorage.setItem('admin_token', newToken)
      setToken(newToken)
      setAdmin(adminData)
      
      // Set token in axios defaults
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setAdmin(null)
    delete api.defaults.headers.common['Authorization']
    // Navigation will be handled by components using useNavigate
  }

  const value = {
    admin,
    token,
    login,
    logout,
    isAuthenticated: !!token
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

