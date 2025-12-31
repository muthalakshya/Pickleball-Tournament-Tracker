import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()
  const isAdminRoute = location.pathname.startsWith('/admin')

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-navy-blue text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={isAuthenticated ? "/admin/dashboard" : "/"} className="flex items-center space-x-3">
              <img 
                src="https://res.cloudinary.com/dacuzjrcg/image/upload/v1757493607/Logo_with_text_h9ypxu.png" 
                alt="Sour Pickle Logo" 
                className="h-12 w-auto"
              />
              <h1 className="text-2xl font-bold">Pickleball Tournament</h1>
            </Link>
            <nav className="hidden md:flex space-x-4 items-center">
              {isAuthenticated ? (
                <>
                  <Link to="/admin/dashboard" className="hover:text-lime-green transition-colors">
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hover:text-lime-green transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" className="hover:text-lime-green transition-colors">
                    Tournaments
                  </Link>
                  {!isAdminRoute && (
                    <Link to="/admin/login" className="btn-primary text-sm">
                      Admin Login
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      {/* <footer className="bg-navy-blue text-white mt-auto py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-cream">© 2025 Pickleball Tournament. All rights reserved.</p>
        </div>
      </footer> */}
    </div>
  )
}

export default Layout

