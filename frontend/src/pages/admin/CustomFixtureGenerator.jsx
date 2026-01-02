import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { calculateStandings, sortStandings } from '../../services/standingsService.js'

const CustomFixtureGenerator = () => {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [rounds, setRounds] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('rounds') // rounds, standings

  // Form states
  const [showCreateRound, setShowCreateRound] = useState(false)
  const [roundForm, setRoundForm] = useState({
    roundName: '',
    useTopPlayers: false,
    topPlayersCount: 4
  })

  const getCompletedMatches = async () => {
    try {
      const response = await adminAPI.getTournamentMatches(id)
      const allMatches = [
        ...(response.data.matches.past || []),
        ...(response.data.matches.live || []),
        ...(response.data.matches.upcoming || []),
        ...(response.data.matches.cancelled || [])
      ]
      return allMatches.filter(m => m.status === 'completed' && m.participantA && m.participantB)
    } catch (err) {
      return []
    }
  }

  const refreshStandings = async () => {
    if (participants.length === 0) return
    
    try {
      const completedMatches = await getCompletedMatches()
      if (completedMatches.length > 0) {
        const calculatedStandings = calculateStandings(participants, completedMatches)
        const sortedStandings = sortStandings(calculatedStandings, completedMatches)
        sortedStandings.forEach((standing, index) => {
          standing.position = index + 1
        })
        setStandings(sortedStandings)
      } else {
        setStandings([])
      }
    } catch (err) {
      console.error('Error refreshing standings:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Auto-refresh standings every 5 seconds
  useEffect(() => {
    if (participants.length === 0 || loading) return

    refreshStandings()
    const interval = setInterval(refreshStandings, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [participants, rounds, loading])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tournamentRes, participantsRes, roundsRes] = await Promise.all([
        adminAPI.getTournament(id),
        adminAPI.getTournamentParticipants(id),
        adminAPI.getCustomRounds(id).catch(() => ({ data: { data: { rounds: [] } } })) // Handle if no rounds exist
      ])
      
      setTournament(tournamentRes.data.data)
      const participantsList = participantsRes.data.data.participants || []
      setParticipants(participantsList)
      setRounds(roundsRes.data.data.rounds || [])
      
      // Calculate initial standings
      const completedMatches = await getCompletedMatches()
      if (participantsList.length > 0 && completedMatches.length > 0) {
        const calculatedStandings = calculateStandings(participantsList, completedMatches)
        const sortedStandings = sortStandings(calculatedStandings, completedMatches)
        sortedStandings.forEach((standing, index) => {
          standing.position = index + 1
        })
        setStandings(sortedStandings)
      } else {
        setStandings([])
      }
      
      setError('')
    } catch (err) {
      setError('Failed to load tournament data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRound = async (e) => {
    e.preventDefault()
    
    if (!roundForm.roundName.trim()) {
      alert('Please enter a round name')
      return
    }

    try {
      let participantIds = null
      
      // If using top players, get top N from standings
      if (roundForm.useTopPlayers && standings.length > 0) {
        const topN = standings.slice(0, parseInt(roundForm.topPlayersCount) || 4)
        participantIds = topN.map(s => s.participant.id)
        
        if (participantIds.length < 2) {
          alert('At least 2 top players are required. Please complete more matches first.')
          return
        }
      }

      await adminAPI.createCustomRound(id, {
        roundName: roundForm.roundName.trim(),
        participantIds: participantIds
      })
      
      setRoundForm({ roundName: '', useTopPlayers: false, topPlayersCount: 4 })
      setShowCreateRound(false)
      fetchData()
      alert('Round created successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create round')
    }
  }

  const handleDeleteRound = async (roundName) => {
    if (!window.confirm(`Are you sure you want to delete all matches in "${roundName}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Get all matches for this round
      const response = await adminAPI.getTournamentMatches(id)
      const allMatches = [
        ...(response.data.matches.past || []),
        ...(response.data.matches.live || []),
        ...(response.data.matches.upcoming || []),
        ...(response.data.matches.cancelled || [])
      ]
      const roundMatches = allMatches.filter(m => m.round === roundName)

      // Delete all matches in this round
      await Promise.all(roundMatches.map(match => adminAPI.deleteMatch(match._id)))
      
      fetchData()
      alert('Round deleted successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete round')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Tournament not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-navy-blue mb-2">Custom Fixtures - {tournament.name}</h1>
              <p className="text-gray-600">Create and manage rounds with matches</p>
            </div>
            <Link
              to={`/admin/tournaments/custom/${id}/manage`}
              className="text-navy-blue hover:text-forest-green font-semibold"
            >
              ← Back to Manage
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('rounds')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'rounds'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              Rounds ({rounds.length})
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'standings'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              Standings
            </button>
          </div>
        </div>

        {/* Rounds Tab */}
        {activeTab === 'rounds' && (
          <div className="space-y-6">
            {/* Create Round Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-navy-blue">Create New Round</h2>
                <button
                  onClick={() => setShowCreateRound(!showCreateRound)}
                  className="btn-primary"
                >
                  {showCreateRound ? 'Cancel' : '+ Create Round'}
                </button>
              </div>

              {showCreateRound && (
                <form onSubmit={handleCreateRound} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Round Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={roundForm.roundName}
                      onChange={(e) => setRoundForm({ ...roundForm, roundName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                      placeholder="e.g., Round 1, Quarter Finals, Semi Finals"
                      required
                    />
                  </div>

                  {rounds.length > 0 && standings.length > 0 && (
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={roundForm.useTopPlayers}
                          onChange={(e) => setRoundForm({ ...roundForm, useTopPlayers: e.target.checked })}
                          className="mr-2 w-4 h-4 text-lime-green focus:ring-lime-green border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-navy-blue">
                          Use Top Players from Standings
                        </span>
                      </label>
                      {roundForm.useTopPlayers && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-navy-blue mb-2">
                            Number of Top Players
                          </label>
                          <input
                            type="number"
                            min="2"
                            max={standings.length}
                            value={roundForm.topPlayersCount}
                            onChange={(e) => setRoundForm({ ...roundForm, topPlayersCount: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                            placeholder="4"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Top {roundForm.topPlayersCount} players from current standings will be selected
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> {roundForm.useTopPlayers 
                        ? `This will create matches for the top ${roundForm.topPlayersCount} players from standings.`
                        : 'This will randomly pair all available participants. If odd number, one participant will get TBD partner.'}
                    </p>
                  </div>

                  <button type="submit" className="btn-primary">
                    Create Round
                  </button>
                </form>
              )}
            </div>

            {/* Rounds List */}
            {rounds.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600 text-lg mb-4">No rounds created yet.</p>
                <p className="text-gray-500 mb-4">Create your first round to start generating matches.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {rounds.map((round) => (
                  <div key={round.roundName} className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-navy-blue">{round.roundName}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span>Total: {round.stats.total}</span>
                          <span>Upcoming: {round.stats.upcoming}</span>
                          <span className="text-pink">Live: {round.stats.live}</span>
                          <span className="text-forest-green">Completed: {round.stats.completed}</span>
                          {round.stats.cancelled > 0 && (
                            <span className="text-red-500">Cancelled: {round.stats.cancelled}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRound(round.roundName)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                      >
                        Delete Round
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {round.matches.map((match) => (
                        <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              match.status === 'live' ? 'bg-pink text-white animate-pulse' :
                              match.status === 'completed' ? 'bg-forest-green text-white' :
                              match.status === 'cancelled' ? 'bg-red-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {match.status.toUpperCase()}
                            </span>
                            {match.courtNumber && (
                              <span className="text-xs text-gray-600">Court {match.courtNumber}</span>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`font-semibold ${!match.participantA ? 'italic text-gray-500' : 'text-navy-blue'}`}>
                                {match.participantA?.name || 'TBD'}
                              </span>
                              <span className="text-lg font-bold text-lime-green">
                                {match.score?.a || 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`font-semibold ${!match.participantB ? 'italic text-gray-500' : 'text-navy-blue'}`}>
                                {match.participantB?.name || 'TBD'}
                              </span>
                              <span className="text-lg font-bold text-lime-green">
                                {match.score?.b || 0}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Link
                              to={`/admin/tournaments/custom/${id}/matches`}
                              className="text-xs text-lime-green hover:text-forest-green font-semibold"
                            >
                              Manage
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-navy-blue">Tournament Standings</h2>
                <span className="text-sm text-gray-500">Auto-updates every 5 seconds</span>
              </div>
              {standings.length === 0 ? (
                <p className="text-gray-600">No standings available yet. Complete some matches to see standings.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-cream text-navy-blue uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Position</th>
                        <th className="py-3 px-6 text-left">Participant</th>
                        <th className="py-3 px-6 text-center">Matches</th>
                        <th className="py-3 px-6 text-center">Wins</th>
                        <th className="py-3 px-6 text-center">Losses</th>
                        <th className="py-3 px-6 text-center">Points For</th>
                        <th className="py-3 px-6 text-center">Points Against</th>
                        <th className="py-3 px-6 text-center">Point Diff</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm">
                      {standings.map((standing, index) => (
                        <tr key={standing.participant.id} className={`border-b border-gray-200 hover:bg-gray-100 ${
                          index < 3 ? 'bg-lime-green bg-opacity-10' : ''
                        }`}>
                          <td className="py-3 px-6 text-left font-bold">
                            {standing.position}
                          </td>
                          <td className="py-3 px-6 text-left">
                            <div>
                              <p className="font-semibold text-navy-blue">{standing.participant.name}</p>
                              {standing.participant.players && standing.participant.players.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {standing.participant.players.join(' & ')}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-6 text-center">{standing.stats.matchesPlayed}</td>
                          <td className="py-3 px-6 text-center font-semibold text-forest-green">
                            {standing.stats.wins}
                          </td>
                          <td className="py-3 px-6 text-center text-red-600">
                            {standing.stats.losses}
                          </td>
                          <td className="py-3 px-6 text-center">{standing.stats.pointsFor}</td>
                          <td className="py-3 px-6 text-center">{standing.stats.pointsAgainst}</td>
                          <td className={`py-3 px-6 text-center font-semibold ${
                            standing.stats.pointDifference > 0 ? 'text-forest-green' :
                            standing.stats.pointDifference < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {standing.stats.pointDifference > 0 ? '+' : ''}{standing.stats.pointDifference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomFixtureGenerator
