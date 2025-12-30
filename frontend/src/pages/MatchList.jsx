import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../services/api'

const MatchList = () => {
  const { id } = useParams()
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMatches()
  }, [id])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const response = await publicAPI.getTournamentMatches(id)
      setMatches(response.data.matches)
      setTournament(response.data.tournament)
      setError(null)
    } catch (err) {
      setError('Failed to load matches')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const MatchCard = ({ match }) => {
    const getStatusBadge = (status) => {
      const badges = {
        live: 'bg-pink text-white animate-pulse',
        completed: 'bg-forest-green text-white',
        upcoming: 'bg-gray-400 text-white',
        cancelled: 'bg-red-500 text-white',
      }
      return badges[status] || 'bg-gray-400 text-white'
    }

    return (
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-navy-blue">{match.round}</h3>
            {match.courtNumber && (
              <p className="text-sm text-gray-600">Court {match.courtNumber}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(match.status)}`}>
            {match.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <p className="font-semibold text-navy-blue">
                {match.participantA?.name || 'TBD'}
              </p>
              {match.participantA?.players && (
                <p className="text-sm text-gray-600">
                  {match.participantA.players.join(' & ')}
                </p>
              )}
            </div>
            <div className="text-2xl font-bold text-lime-green mx-4">
              {match.score?.a || 0}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
            <div className="flex-1">
              <p className="font-semibold text-navy-blue">
                {match.participantB?.name || 'TBD'}
              </p>
              {match.participantB?.players && (
                <p className="text-sm text-gray-600">
                  {match.participantB.players.join(' & ')}
                </p>
              )}
            </div>
            <div className="text-2xl font-bold text-lime-green mx-4">
              {match.score?.b || 0}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-navy-blue text-xl">Loading matches...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to={`/tournament/${id}`} className="btn-primary">
          Back to Tournament
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to={`/tournament/${id}`}
          className="text-lime-green hover:underline mb-4 inline-block"
        >
          ← Back to Tournament
        </Link>
        <h1 className="text-4xl font-bold text-navy-blue mb-2">
          {tournament?.name} - Matches
        </h1>
        <div className="flex gap-4 text-sm mt-4">
          <span className="px-3 py-1 bg-pink text-white rounded-full">
            Live: {matches.live.length}
          </span>
          <span className="px-3 py-1 bg-forest-green text-white rounded-full">
            Completed: {matches.past.length}
          </span>
          <span className="px-3 py-1 bg-gray-400 text-white rounded-full">
            Upcoming: {matches.upcoming.length}
          </span>
        </div>
      </div>

      {/* Live Matches */}
      {matches.live.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-blue mb-4 flex items-center">
            <span className="w-3 h-3 bg-pink rounded-full mr-2 animate-pulse"></span>
            Live Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.live.map((match) => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      {matches.upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">Upcoming Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.upcoming.map((match) => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Past Matches */}
      {matches.past.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-navy-blue mb-4">Past Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.past.map((match) => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Cancelled Matches */}
      {matches.cancelled && matches.cancelled.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-blue mb-4 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Cancelled Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.cancelled.map((match) => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        </div>
      )}

      {matches.live.length === 0 && matches.upcoming.length === 0 && matches.past.length === 0 && (!matches.cancelled || matches.cancelled.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No matches available yet.</p>
        </div>
      )}
    </div>
  )
}

export default MatchList

