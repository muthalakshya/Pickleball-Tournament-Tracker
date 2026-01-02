import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { scrollToTop } from '../utils/scrollToTop'

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Scroll to top on route change
  useEffect(() => {
    scrollToTop()
  }, [location.pathname])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    scrollToTop()
    navigate('/admin/login')
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="container mx-auto">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Title */}
              <Link 
                to={isAuthenticated ? "/admin/tournaments/custom/list" : "/"} 
                onClick={scrollToTop}
                className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 group"
              >
                <img 
                  src="https://res.cloudinary.com/dacuzjrcg/image/upload/v1757493607/Logo_with_text_h9ypxu.png" 
                  alt="Sour Pickle Logo" 
                  className="h-10 sm:h-12 md:h-14 w-auto flex-shrink-0 transition-transform group-hover:scale-105"
                />
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-navy-blue truncate">
                  Pickleball Tournament
                </h1>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-3 lg:space-x-4">
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/admin/tournaments/custom/list" 
                      onClick={scrollToTop}
                      className="px-4 py-2 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all font-medium text-sm lg:text-base text-navy-blue border border-white/30 shadow-sm hover:shadow-md"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all font-medium text-sm lg:text-base text-navy-blue border border-white/30 shadow-sm hover:shadow-md"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/" 
                      onClick={scrollToTop}
                      className="px-4 py-2 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all font-medium text-sm lg:text-base text-navy-blue border border-white/30 shadow-sm hover:shadow-md"
                    >
                      Tournaments
                    </Link>
                    {/* {!isAdminRoute && (
                      <Link 
                        to="/admin/login" 
                        onClick={scrollToTop}
                        className="bg-gradient-to-r from-lime-green to-forest-green hover:from-lime-green/90 hover:to-forest-green/90 text-white px-5 py-2 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-sm lg:text-base"
                      >
                        Admin Login
                      </Link>
                    )} */}
                  </>
                )}
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all border border-white/30 shadow-sm"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6 text-navy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-navy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mt-4 pt-4 border-t border-white/30 animate-in slide-in-from-top">
                <nav className="flex flex-col space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/admin/tournaments/custom/list"
                        onClick={() => {
                          scrollToTop()
                          setMobileMenuOpen(false)
                        }}
                        className="px-4 py-3 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all font-medium text-base text-navy-blue border border-white/30 shadow-sm"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-3 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all font-medium text-base text-navy-blue border border-white/30 shadow-sm text-left"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/"
                        onClick={() => {
                          scrollToTop()
                          setMobileMenuOpen(false)
                        }}
                        className="px-4 py-3 rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all font-medium text-base text-navy-blue border border-white/30 shadow-sm"
                      >
                        Tournaments
                      </Link>
                      {!isAdminRoute && (
                        <Link
                          to="/admin/login"
                          onClick={() => {
                            scrollToTop()
                            setMobileMenuOpen(false)
                          }}
                          className="bg-gradient-to-r from-lime-green to-forest-green hover:from-lime-green/90 hover:to-forest-green/90 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-lg text-center"
                        >
                          Admin Login
                        </Link>
                      )}
                    </>
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
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
