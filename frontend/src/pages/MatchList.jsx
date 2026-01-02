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

  // Get all matches
  const allMatches = [
    ...(matches.upcoming || []),
    ...(matches.live || []),
    ...(matches.past || []),
    ...(matches.cancelled || [])
  ]

  // Group matches by round
  const matchesByRound = {}
  allMatches.forEach(match => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = []
    }
    matchesByRound[match.round].push(match)
  })

  // Define round order: Group matches first, then Quarterfinal, Semifinal, Final
  const getRoundOrder = (round) => {
    if (round.startsWith('Group ')) {
      return `0-${round}` // Groups come first
    }
    const roundOrder = {
      'Quarterfinal': 1,
      'Quarter Finals': 1,
      'Semifinal': 2,
      'Semi Finals': 2,
      'Final': 3
    }
    if (roundOrder[round] !== undefined) {
      return roundOrder[round]
    }
    if (round.toLowerCase().includes('quarter')) return 1
    if (round.toLowerCase().includes('semi')) return 2
    if (round.toLowerCase().includes('final') && !round.toLowerCase().includes('semi') && !round.toLowerCase().includes('quarter')) return 3
    return 4
  }

  // Sort rounds
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
    const orderA = getRoundOrder(a)
    const orderB = getRoundOrder(b)
    if (typeof orderA === 'string' && typeof orderB === 'string') {
      return orderA.localeCompare(orderB)
    }
    if (typeof orderA === 'number' && typeof orderB === 'number') {
      return orderA - orderB
    }
    if (typeof orderA === 'string') return -1
    if (typeof orderB === 'string') return 1
    return 0
  })

  const getStatusBadge = (status) => {
    const badges = {
      live: 'bg-pink text-white animate-pulse',
      completed: 'bg-forest-green text-white',
      upcoming: 'bg-lime-green text-navy-blue',
      cancelled: 'bg-red-500 text-white',
    }
    return badges[status] || 'bg-gray-400 text-white'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-blue text-lg font-semibold">Loading matches...</p>
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
          <Link to={`/tournament/${id}`} className="btn-primary inline-block">
            ← Back to Tournament
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="relative backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Link
              to={`/tournament/${id}`}
              className="inline-flex items-center text-navy-blue hover:text-forest-green mb-4 text-sm sm:text-base font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournament
            </Link>

            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-white/20">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-4">
                {tournament?.name} - All Matches
              </h1>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-pink mb-1">{matches.live?.length || 0}</div>
                  <div className="text-xs text-gray-600 font-medium">Live</div>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-lime-green mb-1">{matches.upcoming?.length || 0}</div>
                  <div className="text-xs text-gray-600 font-medium">Upcoming</div>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-forest-green mb-1">{matches.past?.length || 0}</div>
                  <div className="text-xs text-gray-600 font-medium">Completed</div>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-navy-blue mb-1">{allMatches.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Total</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matches by Round - Table Format */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {sortedRounds.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-white/20">
            <div className="text-6xl mb-4">🏸</div>
            <p className="text-gray-600 text-base sm:text-lg mb-2">No matches scheduled yet</p>
            <p className="text-gray-500 text-sm">Matches will appear here once the tournament begins</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {sortedRounds.map((round) => {
              const roundMatches = matchesByRound[round]
              const liveCount = roundMatches.filter(m => m.status === 'live').length
              const completedCount = roundMatches.filter(m => m.status === 'completed').length
              
              return (
                <div 
                  key={round}
                  className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20"
                >
                  {/* Round Header */}
                  <div className="bg-gradient-to-r from-lime-green/80 to-forest-green/80 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                        {round}
                      </h2>
                      <div className="flex gap-2 sm:gap-3">
                        {liveCount > 0 && (
                          <span className="bg-pink text-white px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            {liveCount} Live
                          </span>
                        )}
                        <span className="bg-white/30 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                          {completedCount}/{roundMatches.length} Done
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Matches Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/40 backdrop-blur-sm">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-navy-blue">Team A</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-navy-blue">Score</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-navy-blue">Team B</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-navy-blue hidden sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/20">
                        {roundMatches.map((match, idx) => {
                          const isLive = match.status === 'live'
                          const isCompleted = match.status === 'completed'
                          const isCancelled = match.status === 'cancelled'
                          
                          return (
                            <tr 
                              key={match._id}
                              className={`hover:bg-white/40 transition-colors ${
                                isLive ? 'bg-pink/10' : 
                                isCompleted ? 'bg-forest-green/10' :
                                isCancelled ? 'bg-gray-200/50' : ''
                              }`}
                            >
                              {/* Team A */}
                              <td className="px-3 sm:px-4 py-3 sm:py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-navy-blue text-sm sm:text-base">
                                    {match.participantA?.name || 'TBD'}
                                  </span>
                                  {match.participantA?.players && (
                                    <span className="text-xs text-gray-600 mt-0.5">
                                      {match.participantA.players.join(' & ')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Score */}
                              <td className="px-3 sm:px-4 py-3 sm:py-4 text-center">
                                {isCancelled ? (
                                  <span className="text-xs sm:text-sm text-gray-500 font-medium">Cancelled</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                                    <span className={`text-lg sm:text-xl md:text-2xl font-bold ${
                                      isLive ? 'text-pink' : 
                                      isCompleted ? 'text-forest-green' : 
                                      'text-gray-400'
                                    }`}>
                                      {match.score?.a || 0}
                                    </span>
                                    <span className="text-gray-400 text-sm sm:text-base">-</span>
                                    <span className={`text-lg sm:text-xl md:text-2xl font-bold ${
                                      isLive ? 'text-pink' : 
                                      isCompleted ? 'text-forest-green' : 
                                      'text-gray-400'
                                    }`}>
                                      {match.score?.b || 0}
                                    </span>
                                    {isLive && (
                                      <span className="w-2 h-2 bg-pink rounded-full animate-pulse"></span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Team B */}
                              <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-semibold text-navy-blue text-sm sm:text-base">
                                    {match.participantB?.name || 'TBD'}
                                  </span>
                                  {match.participantB?.players && (
                                    <span className="text-xs text-gray-600 mt-0.5">
                                      {match.participantB.players.join(' & ')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status (Hidden on mobile) */}
                              <td className="px-3 sm:px-4 py-3 sm:py-4 text-center hidden sm:table-cell">
                                <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                                  isLive ? 'bg-pink text-white animate-pulse' :
                                  isCompleted ? 'bg-forest-green text-white' :
                                  isCancelled ? 'bg-gray-400 text-white' :
                                  'bg-lime-green text-navy-blue'
                                }`}>
                                  {match.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchList
