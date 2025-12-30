import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminAPI, publicAPI } from '../../services/api'

const FixturesManagement = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [] })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchTournament()
    fetchMatches()
  }, [id])

  const fetchTournament = async () => {
    try {
      const response = await adminAPI.getTournament(id)
      setTournament(response.data.data)
    } catch (err) {
      setError('Failed to load tournament')
      console.error(err)
    }
  }

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const response = await publicAPI.getTournamentMatches(id)
      setMatches(response.data.matches || { past: [], live: [], upcoming: [] })
    } catch (err) {
      console.error('Failed to load matches:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFixtures = async () => {
    if (!window.confirm('This will generate fixtures for all participants. Continue?')) {
      return
    }

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const response = await adminAPI.generateFixtures(id, {})
      setSuccess(response.data.message || 'Fixtures generated successfully!')
      // Refresh matches
      fetchMatches()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate fixtures')
    } finally {
      setGenerating(false)
    }
  }

  const totalMatches = matches.past.length + matches.live.length + matches.upcoming.length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/admin/tournaments/${id}`}
          className="text-forest-green hover:text-navy-blue mb-4 inline-block"
        >
          ← Back to Tournament
        </Link>
        <h1 className="text-3xl font-bold text-navy-blue mt-4">
          Generate Fixtures
        </h1>
        {tournament && (
          <p className="text-gray-600 mt-2">
            {tournament.name} • {tournament.type} • {tournament.format}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Fixtures Section */}
        <div className="card">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">
            Generate Tournament Fixtures
          </h2>
          <p className="text-gray-600 mb-4">
            Automatically generate matches based on the tournament format and participants.
          </p>

          {tournament && (
            <div className="mb-6 p-4 bg-cream rounded-lg">
              <h3 className="font-semibold text-navy-blue mb-2">Tournament Details:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Format:</strong> {tournament.format}</li>
                <li><strong>Type:</strong> {tournament.type}</li>
                <li><strong>Status:</strong> {tournament.status}</li>
                <li><strong>Current Round:</strong> {tournament.currentRound || 'Not started'}</li>
              </ul>
            </div>
          )}

          <button
            onClick={handleGenerateFixtures}
            disabled={generating || tournament?.status === 'completed'}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating Fixtures...' : 'Generate Fixtures'}
          </button>

          {tournament?.status === 'completed' && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Cannot generate fixtures for completed tournaments
            </p>
          )}

          <div className="mt-6 p-4 bg-cream rounded-lg">
            <h3 className="font-semibold text-navy-blue mb-2">How it works:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Round Robin:</strong> All participants play against each other</li>
              <li>• <strong>Group Stage:</strong> Participants divided into groups, play within groups</li>
              <li>• <strong>Knockout:</strong> Single elimination bracket with byes for odd numbers</li>
            </ul>
          </div>
        </div>

        {/* Matches Overview */}
        <div className="card">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">
            Matches Overview
          </h2>

          {loading ? (
            <div className="text-center py-8">Loading matches...</div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-lime-green bg-opacity-10 rounded-lg">
                <div className="text-2xl font-bold text-navy-blue">{totalMatches}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-pink bg-opacity-10 rounded-lg text-center">
                  <div className="text-xl font-bold text-pink">{matches.live.length}</div>
                  <div className="text-xs text-gray-600">Live</div>
                </div>
                <div className="p-3 bg-forest-green bg-opacity-10 rounded-lg text-center">
                  <div className="text-xl font-bold text-forest-green">{matches.past.length}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="p-3 bg-gray-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-gray-700">{matches.upcoming.length}</div>
                  <div className="text-xs text-gray-600">Upcoming</div>
                </div>
              </div>

              {totalMatches > 0 && (
                <div className="mt-4">
                  <Link
                    to={`/admin/tournaments/${id}/matches`}
                    className="block w-full btn-secondary text-center"
                  >
                    View All Matches
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FixturesManagement

