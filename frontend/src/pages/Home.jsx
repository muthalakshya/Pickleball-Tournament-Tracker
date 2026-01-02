import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicAPI } from '../services/api'

const Home = () => {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await publicAPI.getTournaments()
      setTournaments(response.data.data || [])
      setError(null)
    } catch (err) {
      setError('Failed to load tournaments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      live: 'bg-pink text-white animate-pulse',
      completed: 'bg-forest-green text-white',
      draft: 'bg-gray-400 text-white',
      comingSoon: 'bg-blue-500 text-white',
      delayed: 'bg-yellow-500 text-white',
      cancelled: 'bg-red-500 text-white'
    }
    return badges[status] || 'bg-gray-400 text-white'
  }

  const formatDate = (date) => {
    if (!date) return 'TBA'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-blue text-lg font-semibold">Loading tournaments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-600 mb-4 text-lg font-semibold">{error}</p>
          <button onClick={fetchTournaments} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 border border-white/20 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-navy-blue mb-4">
                🏸 Pickleball Tournaments
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6">
                View all active pickleball tournaments
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                <div className="bg-white/40 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="text-2xl sm:text-3xl font-bold text-pink">{tournaments.filter(t => t.status === 'live').length}</div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Live</div>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="text-2xl sm:text-3xl font-bold text-lime-green">{tournaments.filter(t => t.status === 'comingSoon').length}</div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Coming Soon</div>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="text-2xl sm:text-3xl font-bold text-forest-green">{tournaments.filter(t => t.status === 'completed').length}</div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {tournaments.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-white/20">
            <div className="text-6xl mb-4">🏸</div>
            <p className="text-gray-600 text-base sm:text-lg mb-2">No tournaments available at the moment.</p>
            <p className="text-gray-500 text-sm">Check back later for upcoming tournaments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tournaments.map((tournament) => (
              <Link
                key={tournament._id}
                to={`/tournament/${tournament._id}`}
                className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-white/20 overflow-hidden group"
              >
                {/* Tournament Header */}
                <div className="bg-gradient-to-r from-lime-green/80 to-forest-green/80 p-4 sm:p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex-1 pr-2 group-hover:scale-105 transition-transform">
                      {tournament.name}
                    </h2>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getStatusBadge(tournament.status)}`}>
                      {tournament.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Tournament Details */}
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 mb-4">
                    {tournament.location && (
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <span className="text-lime-green text-lg">📍</span>
                        <span className="text-gray-700 font-medium truncate">{tournament.location}</span>
                      </div>
                    )}
                    
                    {tournament.date && (
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <span className="text-pink text-lg">📅</span>
                        <span className="text-gray-700 font-medium">{formatDate(tournament.date)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="text-forest-green text-lg">🎾</span>
                      <span className="text-gray-700 font-medium capitalize">{tournament.type}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="text-navy-blue text-lg">⚙️</span>
                      <span className="text-gray-700 font-medium capitalize">{tournament.format}</span>
                    </div>

                    {tournament.currentRound && (
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <span className="text-lime-green text-lg">🏆</span>
                        <span className="text-gray-700 font-medium">{tournament.currentRound}</span>
                      </div>
                    )}
                  </div>

                  {/* View Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-lime-green font-semibold group-hover:text-forest-green transition-colors text-sm sm:text-base">
                        View Tournament
                      </span>
                      <svg className="w-5 h-5 text-lime-green group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
