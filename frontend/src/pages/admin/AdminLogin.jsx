import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      navigate('/admin/tournaments/custom/list')
    } else {
      setError(result.message || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Home Button on Top Left */}
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-navy-blue hover:text-forest-green font-semibold text-sm sm:text-base px-3 py-1 rounded-md hover:bg-lime-green/20 transition"
        aria-label="Back to Home"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
        </svg>
        Home
      </Link>
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <img
            className="mx-auto h-12 sm:h-16 w-auto"
            src="https://res.cloudinary.com/dacuzjrcg/image/upload/v1757493607/Logo_with_text_h9ypxu.png"
            alt="Sour Pickle Logo"
          />
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-navy-blue">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage tournaments
          </p>
        </div>
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm sm:text-base">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 placeholder-gray-500 text-navy-blue rounded-t-md focus:outline-none focus:ring-lime-green focus:border-lime-green focus:z-10 text-sm sm:text-base"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 placeholder-gray-500 text-navy-blue rounded-b-md focus:outline-none focus:ring-lime-green focus:border-lime-green focus:z-10 text-sm sm:text-base"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-navy-blue bg-lime-green hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
