import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../services/api'

const TournamentView = () => {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTournament()
  }, [id])

  const fetchTournament = async () => {
    try {
      setLoading(true)
      const response = await publicAPI.getTournament(id)
      setTournament(response.data.data)
      setError(null)
    } catch (err) {
      setError('Failed to load tournament')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-navy-blue text-xl">Loading tournament...</div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || 'Tournament not found'}</p>
        <Link to="/" className="btn-primary inline-block">
          Back to Tournaments
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Tournament Header */}
      <div className="mb-8">
        <Link to="/" className="text-lime-green hover:underline mb-4 inline-block">
          ← Back to Tournaments
        </Link>
        <h1 className="text-4xl font-bold text-navy-blue mb-2">{tournament.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="px-3 py-1 bg-forest-green text-white rounded-full">
            {tournament.type.toUpperCase()}
          </span>
          <span className="px-3 py-1 bg-pink text-white rounded-full">
            {tournament.format.toUpperCase()}
          </span>
          <span className="px-3 py-1 bg-lime-green text-navy-blue rounded-full font-semibold">
            {tournament.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tournament Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">Tournament Details</h2>
          <div className="space-y-3">
            <div>
              <span className="font-semibold text-gray-700">Current Round:</span>
              <p className="text-navy-blue">{tournament.currentRound || 'Not started'}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Scoring System:</span>
              <p className="text-navy-blue capitalize">{tournament.rules.scoringSystem}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Points:</span>
              <p className="text-navy-blue">{tournament.rules.points}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to={`/tournament/${id}/matches`}
              className="block btn-primary text-center"
            >
              View Matches
            </Link>
            <Link
              to={`/tournament/${id}/standings`}
              className="block bg-forest-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-center font-semibold"
            >
              View Standings
            </Link>
            <Link
              to={`/tournament/${id}/bracket`}
              className="block btn-secondary text-center"
            >
              View Bracket
            </Link>
          </div>
        </div>
      </div>

      {/* Standings Preview */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-navy-blue">Standings</h2>
          <Link
            to={`/tournament/${id}/standings`}
            className="text-lime-green hover:underline"
          >
            View Full Standings →
          </Link>
        </div>
        <p className="text-gray-600">Standings will be displayed here once matches are completed.</p>
      </div>
    </div>
  )
}

export default TournamentView

