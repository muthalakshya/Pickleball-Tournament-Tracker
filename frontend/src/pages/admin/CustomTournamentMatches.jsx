import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { scrollToTop } from '../../utils/scrollToTop'

const CustomTournamentMatches = () => {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [groupStandings, setGroupStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('rounds')
  const [selectedRound, setSelectedRound] = useState('all')
  const [selectedGroup, setSelectedGroup] = useState('all')

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tournamentRes, matchesRes, standingsRes] = await Promise.all([
        adminAPI.getTournament(id),
        adminAPI.getTournamentMatches(id),
        adminAPI.getGroupStandings(id).catch(() => ({ data: { data: { groupStandings: [] } } }))
      ])
      
      setTournament(tournamentRes.data.data)
      setMatches(matchesRes.data.matches || { past: [], live: [], upcoming: [], cancelled: [] })
      setGroupStandings(standingsRes.data.data.groupStandings || [])
      setError('')
    } catch (err) {
      setError('Failed to load tournament data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const allMatches = [
    ...(matches.past || []),
    ...(matches.live || []),
    ...(matches.upcoming || []),
    ...(matches.cancelled || [])
  ]
  
  const rounds = [...new Set(allMatches.map(m => m.round))].sort()
  const groupRounds = rounds.filter(r => r.startsWith('Group '))
  const knockoutRounds = rounds.filter(r => !r.startsWith('Group '))

  let filteredMatches = allMatches
  if (selectedRound !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.round === selectedRound)
  }
  if (selectedGroup !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.round === `Group ${selectedGroup}`)
  }

  const matchesByRound = {}
  allMatches.forEach(match => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = {
        round: match.round,
        matches: [],
        stats: {
          total: 0,
          upcoming: 0,
          live: 0,
          completed: 0,
          cancelled: 0
        }
      }
    }
    matchesByRound[match.round].matches.push(match)
    matchesByRound[match.round].stats.total++
    matchesByRound[match.round].stats[match.status]++
  })

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
          <Link to={`/admin/tournaments/custom/${id}/manage`} onClick={scrollToTop} className="btn-primary inline-block">
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
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-2">Matches</h1>
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

        {/* View Mode Tabs */}
        <div className="mb-6 bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-2 border border-white/20">
          <div className="flex gap-2">
            <button
              onClick={() => { setViewMode('rounds'); scrollToTop() }}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 font-semibold rounded-xl transition-all text-sm sm:text-base ${
                viewMode === 'rounds'
                  ? 'bg-gradient-to-r from-lime-green to-forest-green text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/40'
              }`}
            >
              Round-wise
            </button>
            {groupRounds.length > 0 && (
              <button
                onClick={() => { setViewMode('groups'); scrollToTop() }}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 font-semibold rounded-xl transition-all text-sm sm:text-base ${
                  viewMode === 'groups'
                    ? 'bg-gradient-to-r from-lime-green to-forest-green text-white shadow-lg'
                    : 'text-gray-600 hover:bg-white/40'
                }`}
              >
                Group-wise
              </button>
            )}
            <button
              onClick={() => { setViewMode('all'); scrollToTop() }}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 font-semibold rounded-xl transition-all text-sm sm:text-base ${
                viewMode === 'all'
                  ? 'bg-gradient-to-r from-lime-green to-forest-green text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/40'
              }`}
            >
              All Matches
            </button>
          </div>
        </div>

        {/* Round-wise View */}
        {viewMode === 'rounds' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Round Filter */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Filter by Round:
              </label>
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
              >
                <option value="all">All Rounds</option>
                {rounds.map(round => (
                  <option key={round} value={round}>{round}</option>
                ))}
              </select>
            </div>

            {/* Rounds List */}
            {rounds.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-white/20">
                <div className="text-6xl mb-4">🏸</div>
                <p className="text-gray-600 text-base sm:text-lg mb-2">No matches found.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {Object.values(matchesByRound)
                  .filter(roundData => {
                    if (selectedRound !== 'all' && roundData.round !== selectedRound) return false
                    if (selectedGroup !== 'all' && !roundData.round.startsWith(`Group ${selectedGroup}`)) return false
                    return true
                  })
                  .map((roundData) => (
                    <div key={roundData.round} className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-2xl font-bold text-navy-blue mb-2">{roundData.round}</h3>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                            <span className="bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">Total: {roundData.stats.total}</span>
                            <span className="bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">Upcoming: {roundData.stats.upcoming}</span>
                            <span className="bg-pink/20 text-pink px-2 py-1 rounded-lg font-semibold">Live: {roundData.stats.live}</span>
                            <span className="bg-forest-green/20 text-forest-green px-2 py-1 rounded-lg font-semibold">Completed: {roundData.stats.completed}</span>
                            {roundData.stats.cancelled > 0 && (
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg font-semibold">Cancelled: {roundData.stats.cancelled}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {roundData.matches.map((match) => (
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

        {/* Group-wise View */}
        {viewMode === 'groups' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Group Standings */}
            {groupStandings.length > 0 && (
              <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4">Group Standings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {groupStandings.map((group) => (
                    <div key={group.groupName} className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30 shadow-md">
                      <h3 className="text-base sm:text-lg font-bold text-navy-blue mb-3">Group {group.groupName}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-lime-green/80 to-forest-green/80 text-white">
                              <th className="px-2 py-1 text-left">Pos</th>
                              <th className="px-2 py-1 text-left">Team</th>
                              <th className="px-2 py-1 text-center">W</th>
                              <th className="px-2 py-1 text-center">PD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.standings.map((standing, idx) => (
                              <tr key={standing.participant.id} className={`border-b ${idx < 2 ? 'bg-lime-green/20' : ''}`}>
                                <td className="px-2 py-1 font-bold">{standing.position}</td>
                                <td className="px-2 py-1">{standing.participant.name}</td>
                                <td className="px-2 py-1 text-center">{standing.stats.wins}</td>
                                <td className="px-2 py-1 text-center">{standing.stats.pointDifference}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group Matches */}
            {groupRounds.map((round) => {
              const roundMatches = allMatches.filter(m => m.round === round)
              return (
                <div key={round} className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                  <h3 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4">{round}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {roundMatches.map((match) => (
                      <div key={match._id} className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            match.status === 'live' ? 'bg-pink text-white animate-pulse' :
                            match.status === 'completed' ? 'bg-forest-green text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {match.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm sm:text-base text-navy-blue">
                              {match.participantA?.name || 'TBD'}
                            </span>
                            <span className="text-lg sm:text-xl font-bold text-lime-green">
                              {match.score?.a || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm sm:text-base text-navy-blue">
                              {match.participantB?.name || 'TBD'}
                            </span>
                            <span className="text-lg sm:text-xl font-bold text-lime-green">
                              {match.score?.b || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* All Matches View */}
        {viewMode === 'all' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Match Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-lg p-3 sm:p-4 text-center border border-white/20">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Upcoming</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-400">{matches.upcoming?.length || 0}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-lg p-3 sm:p-4 text-center border border-white/20">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Live</p>
                <p className="text-xl sm:text-2xl font-bold text-pink">{matches.live?.length || 0}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-lg p-3 sm:p-4 text-center border border-white/20">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-forest-green">{matches.past?.length || 0}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-lg p-3 sm:p-4 text-center border border-white/20">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Cancelled</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{matches.cancelled?.length || 0}</p>
              </div>
            </div>

            {/* All Matches List */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4">All Matches</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredMatches.map((match) => (
                  <div key={match._id} className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs text-gray-600 bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">{match.round}</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        match.status === 'live' ? 'bg-pink text-white animate-pulse' :
                        match.status === 'completed' ? 'bg-forest-green text-white' :
                        match.status === 'cancelled' ? 'bg-red-500 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                        {match.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-2">
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomTournamentMatches
