import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { calculateStandings, sortStandings } from '../../services/standingsService.js'
import { scrollToTop } from '../../utils/scrollToTop'

const CustomFixtureGenerator = () => {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [rounds, setRounds] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('rounds')

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

  useEffect(() => {
    if (participants.length === 0 || loading) return
    refreshStandings()
    const interval = setInterval(refreshStandings, 5000)
    return () => clearInterval(interval)
  }, [participants, rounds, loading])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tournamentRes, participantsRes, roundsRes] = await Promise.all([
        adminAPI.getTournament(id),
        adminAPI.getTournamentParticipants(id),
        adminAPI.getCustomRounds(id).catch(() => ({ data: { data: { rounds: [] } } }))
      ])
      
      setTournament(tournamentRes.data.data)
      const participantsList = participantsRes.data.data.participants || []
      setParticipants(participantsList)
      setRounds(roundsRes.data.data.rounds || [])
      
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
    scrollToTop()
    
    if (!roundForm.roundName.trim()) {
      alert('Please enter a round name')
      return
    }

    try {
      let participantIds = null
      
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
      const response = await adminAPI.getTournamentMatches(id)
      const allMatches = [
        ...(response.data.matches.past || []),
        ...(response.data.matches.live || []),
        ...(response.data.matches.upcoming || []),
        ...(response.data.matches.cancelled || [])
      ]
      const roundMatches = allMatches.filter(m => m.round === roundName)

      await Promise.all(roundMatches.map(match => adminAPI.deleteMatch(match._id)))
      
      fetchData()
      alert('Round deleted successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete round')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-blue text-lg font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-600 mb-4 text-lg font-semibold">{error || 'Tournament not found'}</p>
          <Link to={`/admin/tournaments/custom/${id}/manage`} className="btn-primary inline-block">
            ← Back to Manage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-2">
                  Custom Fixtures
                </h1>
                <p className="text-sm sm:text-base text-gray-600">{tournament.name}</p>
              </div>
              <Link
                to={`/admin/tournaments/custom/${id}/manage`}
                onClick={scrollToTop}
                className="inline-flex items-center text-navy-blue hover:text-forest-green font-semibold text-sm sm:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Manage
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-2 border border-white/20">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('rounds'); scrollToTop() }}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 font-semibold rounded-xl transition-all text-sm sm:text-base ${
                activeTab === 'rounds'
                  ? 'bg-gradient-to-r from-lime-green to-forest-green text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/40'
              }`}
            >
              Rounds ({rounds.length})
            </button>
            <button
              onClick={() => { setActiveTab('standings'); scrollToTop() }}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 font-semibold rounded-xl transition-all text-sm sm:text-base ${
                activeTab === 'standings'
                  ? 'bg-gradient-to-r from-lime-green to-forest-green text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/40'
              }`}
            >
              Standings
            </button>
          </div>
        </div>

        {/* Rounds Tab */}
        {activeTab === 'rounds' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Create Round Section */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-navy-blue">Create New Round</h2>
                <button
                  onClick={() => { setShowCreateRound(!showCreateRound); scrollToTop() }}
                  className="btn-primary text-sm sm:text-base px-4 py-2"
                >
                  {showCreateRound ? 'Cancel' : '+ Create Round'}
                </button>
              </div>

              {showCreateRound && (
                <form onSubmit={handleCreateRound} className="space-y-4 p-4 sm:p-6 bg-white/40 backdrop-blur-sm rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Round Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={roundForm.roundName}
                      onChange={(e) => setRoundForm({ ...roundForm, roundName: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                      placeholder="e.g., Round 1, Quarter Finals"
                      required
                    />
                  </div>

                  {rounds.length > 0 && standings.length > 0 && (
                    <div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roundForm.useTopPlayers}
                          onChange={(e) => setRoundForm({ ...roundForm, useTopPlayers: e.target.checked })}
                          className="mr-2 w-5 h-5 text-lime-green focus:ring-lime-green border-gray-300 rounded"
                        />
                        <span className="text-sm sm:text-base font-medium text-navy-blue">
                          Use Top Players from Standings
                        </span>
                      </label>
                      {roundForm.useTopPlayers && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-navy-blue mb-2">
                            Number of Top Players
                          </label>
                          <input
                            type="number"
                            min="2"
                            max={standings.length}
                            value={roundForm.topPlayersCount}
                            onChange={(e) => setRoundForm({ ...roundForm, topPlayersCount: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                            placeholder="4"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Top {roundForm.topPlayersCount} players from current standings will be selected
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-blue-800">
                      <strong>Note:</strong> {roundForm.useTopPlayers 
                        ? `This will create matches for the top ${roundForm.topPlayersCount} players from standings.`
                        : 'This will randomly pair all available participants. If odd number, one participant will get TBD partner.'}
                    </p>
                  </div>

                  <button type="submit" className="btn-primary w-full sm:w-auto text-sm sm:text-base px-6 py-3">
                    Create Round
                  </button>
                </form>
              )}
            </div>

            {/* Rounds List */}
            {rounds.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-white/20">
                <div className="text-6xl mb-4">🏸</div>
                <p className="text-gray-600 text-base sm:text-lg mb-2">No rounds created yet.</p>
                <p className="text-gray-500 text-sm">Create your first round to start generating matches.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {rounds.map((round) => (
                  <div key={round.roundName} className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-navy-blue mb-2">{round.roundName}</h3>
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <span className="bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">Total: {round.stats.total}</span>
                          <span className="bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">Upcoming: {round.stats.upcoming}</span>
                          <span className="bg-pink/20 text-pink px-2 py-1 rounded-lg font-semibold">Live: {round.stats.live}</span>
                          <span className="bg-forest-green/20 text-forest-green px-2 py-1 rounded-lg font-semibold">Completed: {round.stats.completed}</span>
                          {round.stats.cancelled > 0 && (
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg font-semibold">Cancelled: {round.stats.cancelled}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRound(round.roundName)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm sm:text-base px-3 py-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Delete Round
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {round.matches.map((match) => (
                        <div key={match._id} className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30 shadow-md hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              match.status === 'live' ? 'bg-pink text-white animate-pulse' :
                              match.status === 'completed' ? 'bg-forest-green text-white' :
                              match.status === 'cancelled' ? 'bg-red-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {match.status.toUpperCase()}
                            </span>
                            {match.courtNumber && (
                              <span className="text-xs text-gray-600 bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">Court {match.courtNumber}</span>
                            )}
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center">
                              <span className={`font-semibold text-sm sm:text-base ${!match.participantA ? 'italic text-gray-500' : 'text-navy-blue'}`}>
                                {match.participantA?.name || 'TBD'}
                              </span>
                              <span className="text-lg sm:text-xl font-bold text-lime-green">
                                {match.score?.a || 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`font-semibold text-sm sm:text-base ${!match.participantB ? 'italic text-gray-500' : 'text-navy-blue'}`}>
                                {match.participantB?.name || 'TBD'}
                              </span>
                              <span className="text-lg sm:text-xl font-bold text-lime-green">
                                {match.score?.b || 0}
                              </span>
                            </div>
                          </div>

                          <Link
                            to={`/admin/tournaments/custom/${id}/matches/manage`}
                            onClick={scrollToTop}
                            className="text-xs sm:text-sm text-lime-green hover:text-forest-green font-semibold inline-flex items-center"
                          >
                            Manage →
                          </Link>
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
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-navy-blue">Tournament Standings</h2>
                <span className="text-xs sm:text-sm text-gray-500 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-lg">Auto-updates every 5 seconds</span>
              </div>
              {standings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-sm sm:text-base">No standings available yet. Complete some matches to see standings.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-lime-green/80 to-forest-green/80 text-white">
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold uppercase">Position</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold uppercase">Participant</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold uppercase hidden sm:table-cell">Matches</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold uppercase">Wins</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold uppercase hidden md:table-cell">Losses</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold uppercase hidden lg:table-cell">Points For</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold uppercase hidden lg:table-cell">Points Against</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold uppercase">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/40 backdrop-blur-sm divide-y divide-white/20">
                      {standings.map((standing, index) => (
                        <tr key={standing.participant.id} className={`hover:bg-white/60 transition-colors ${
                          index < 3 ? 'bg-lime-green/20' : ''
                        }`}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-sm sm:text-base">
                            {index === 0 && <span className="text-yellow-500 mr-1">🏆</span>}
                            {standing.position}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-left">
                            <div>
                              <p className="font-semibold text-navy-blue text-sm sm:text-base">{standing.participant.name}</p>
                              {standing.participant.players && standing.participant.players.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {standing.participant.players.join(' & ')}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center hidden sm:table-cell text-sm">{standing.stats.matchesPlayed}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center font-semibold text-forest-green text-sm sm:text-base">
                            {standing.stats.wins}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center text-red-600 hidden md:table-cell text-sm">{standing.stats.losses}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center hidden lg:table-cell text-sm">{standing.stats.pointsFor}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center hidden lg:table-cell text-sm">{standing.stats.pointsAgainst}</td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 text-center font-semibold text-sm sm:text-base ${
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
