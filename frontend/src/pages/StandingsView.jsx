import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../services/api'

const StandingsView = () => {
  const { id } = useParams()
  const [standings, setStandings] = useState([])
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStandings()
  }, [id])

  const fetchStandings = async () => {
    try {
      setLoading(true)
      const response = await publicAPI.getTournamentStandings(id)
      setStandings(response.data.standings || [])
      setTournament(response.data.tournament)
      setError(null)
    } catch (err) {
      setError('Failed to load standings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-navy-blue text-xl">Loading standings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to={`/tournament/${id}`} className="btn-primary inline-block">
          Back to Tournament
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link to={`/tournament/${id}`} className="text-lime-green hover:underline mb-4 inline-block">
          ← Back to Tournament
        </Link>
        <h1 className="text-4xl font-bold text-navy-blue mb-2">
          {tournament?.name} - Standings
        </h1>
        <p className="text-gray-600">
          Point table and tournament statistics
        </p>
      </div>

      {/* Standings Table */}
      {standings.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600 mb-4">No standings available yet.</p>
          <p className="text-sm text-gray-500">
            Standings will appear once matches are completed.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <h2 className="text-2xl font-bold text-navy-blue mb-6">Point Table</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-navy-blue">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Matches
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Wins
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Losses
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Points For
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Points Against
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Win Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {standings.map((standing, index) => (
                <tr 
                  key={standing.participant.id} 
                  className={`hover:bg-cream ${
                    index === 0 ? 'bg-lime-green bg-opacity-10' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && (
                        <span className="text-yellow-500 mr-2">🏆</span>
                      )}
                      <span className={`text-sm font-bold ${
                        index === 0 ? 'text-lime-green' : 'text-navy-blue'
                      }`}>
                        {standing.position}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-navy-blue">
                      {standing.participant.name}
                    </div>
                    {standing.participant.players && standing.participant.players.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {standing.participant.players.join(' & ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-700">
                      {standing.stats.matchesPlayed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-forest-green">
                      {standing.stats.wins}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-red-600">
                      {standing.stats.losses}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-700">
                      {standing.stats.pointsFor}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-700">
                      {standing.stats.pointsAgainst}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-semibold ${
                      standing.stats.pointDifference >= 0 
                        ? 'text-forest-green' 
                        : 'text-red-600'
                    }`}>
                      {standing.stats.pointDifference >= 0 ? '+' : ''}
                      {standing.stats.pointDifference}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-700">
                      {standing.stats.winRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-navy-blue mb-3">Tournament Info</h3>
          {tournament && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Format:</span>
                <span className="ml-2 text-navy-blue capitalize">{tournament.format}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Type:</span>
                <span className="ml-2 text-navy-blue capitalize">{tournament.type}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Status:</span>
                <span className="ml-2 text-navy-blue capitalize">{tournament.status}</span>
              </div>
              {tournament.currentRound && (
                <div>
                  <span className="font-semibold text-gray-700">Current Round:</span>
                  <span className="ml-2 text-navy-blue">{tournament.currentRound}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-navy-blue mb-3">Quick Links</h3>
          <div className="space-y-2">
            <Link
              to={`/tournament/${id}/matches`}
              className="block btn-secondary text-center text-sm"
            >
              View Matches
            </Link>
            <Link
              to={`/tournament/${id}/bracket`}
              className="block btn-primary text-center text-sm"
            >
              View Bracket
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StandingsView

