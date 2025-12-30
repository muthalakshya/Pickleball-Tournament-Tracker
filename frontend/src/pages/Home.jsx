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
      live: 'bg-pink text-white',
      completed: 'bg-forest-green text-white',
      draft: 'bg-gray-400 text-white',
    }
    return badges[status] || 'bg-gray-400 text-white'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-navy-blue text-xl">Loading tournaments...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchTournaments} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy-blue mb-2">Live Tournaments</h1>
        <p className="text-gray-600">View all active pickleball tournaments</p>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No tournaments available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Link
              key={tournament._id}
              to={`/tournament/${tournament._id}`}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-navy-blue">{tournament.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(tournament.status)}`}>
                  {tournament.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Type:</span>
                  <span className="capitalize">{tournament.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Format:</span>
                  <span className="capitalize">{tournament.format}</span>
                </div>
                {tournament.currentRound && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Round:</span>
                    <span>{tournament.currentRound}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="text-lime-green font-semibold hover:underline">
                  View Tournament →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Home

