import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const CustomTournamentMatches = () => {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [groupStandings, setGroupStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('rounds') // 'rounds', 'groups', 'all'
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

  // Get unique rounds
  const allMatches = [
    ...(matches.past || []),
    ...(matches.live || []),
    ...(matches.upcoming || []),
    ...(matches.cancelled || [])
  ]
  
  const rounds = [...new Set(allMatches.map(m => m.round))].sort()
  const groupRounds = rounds.filter(r => r.startsWith('Group '))
  const knockoutRounds = rounds.filter(r => !r.startsWith('Group '))

  // Filter matches by selected round and group
  let filteredMatches = allMatches
  if (selectedRound !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.round === selectedRound)
  }
  if (selectedGroup !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.round === `Group ${selectedGroup}`)
  }

  // Group matches by round
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
              <h1 className="text-4xl font-bold text-navy-blue mb-2">Matches - {tournament.name}</h1>
              <p className="text-gray-600">View and manage all tournament matches</p>
            </div>
            <Link
              to={`/admin/tournaments/custom/${id}/manage`}
              className="text-navy-blue hover:text-forest-green font-semibold"
            >
              ← Back to Manage
            </Link>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('rounds')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                viewMode === 'rounds'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              Round-wise
            </button>
            {groupRounds.length > 0 && (
              <button
                onClick={() => setViewMode('groups')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  viewMode === 'groups'
                    ? 'border-lime-green text-lime-green'
                    : 'border-transparent text-gray-600 hover:text-navy-blue'
                }`}
              >
                Group-wise
              </button>
            )}
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                viewMode === 'all'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              All Matches
            </button>
          </div>
        </div>

        {/* Round-wise View */}
        {viewMode === 'rounds' && (
          <div className="space-y-6">
            {/* Round Filter */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Filter by Round:
              </label>
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
              >
                <option value="all">All Rounds</option>
                {rounds.map(round => (
                  <option key={round} value={round}>{round}</option>
                ))}
              </select>
            </div>

            {/* Rounds List */}
            {rounds.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600 text-lg mb-4">No matches found.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.values(matchesByRound)
                  .filter(roundData => {
                    if (selectedRound !== 'all' && roundData.round !== selectedRound) return false
                    if (selectedGroup !== 'all' && !roundData.round.startsWith(`Group ${selectedGroup}`)) return false
                    return true
                  })
                  .map((roundData) => (
                    <div key={roundData.round} className="bg-white rounded-lg shadow-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-navy-blue">{roundData.round}</h3>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>Total: {roundData.stats.total}</span>
                            <span>Upcoming: {roundData.stats.upcoming}</span>
                            <span className="text-pink">Live: {roundData.stats.live}</span>
                            <span className="text-forest-green">Completed: {roundData.stats.completed}</span>
                            {roundData.stats.cancelled > 0 && (
                              <span className="text-red-500">Cancelled: {roundData.stats.cancelled}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roundData.matches.map((match) => (
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
                                to={`/admin/tournaments/${id}/matches`}
                                className="text-xs text-lime-green hover:text-forest-green font-semibold"
                                onClick={(e) => {
                                  // Store match ID in sessionStorage for match controller to highlight
                                  sessionStorage.setItem('highlightMatch', match._id)
                                }}
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

        {/* Group-wise View */}
        {viewMode === 'groups' && (
          <div className="space-y-6">
            {/* Group Standings */}
            {groupStandings.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-navy-blue mb-4">Group Standings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {groupStandings.map((group) => (
                    <div key={group.groupName} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-navy-blue mb-3">Group {group.groupName}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-cream text-navy-blue">
                              <th className="px-2 py-1 text-left">Pos</th>
                              <th className="px-2 py-1 text-left">Team</th>
                              <th className="px-2 py-1 text-center">W</th>
                              <th className="px-2 py-1 text-center">PD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.standings.map((standing, idx) => (
                              <tr key={standing.participant.id} className={`border-b ${
                                idx < 2 ? 'bg-lime-green bg-opacity-10' : ''
                              }`}>
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
                <div key={round} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-navy-blue mb-4">{round}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roundMatches.map((match) => (
                      <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            match.status === 'live' ? 'bg-pink text-white animate-pulse' :
                            match.status === 'completed' ? 'bg-forest-green text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {match.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-navy-blue">
                              {match.participantA?.name || 'TBD'}
                            </span>
                            <span className="text-lg font-bold text-lime-green">
                              {match.score?.a || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-navy-blue">
                              {match.participantB?.name || 'TBD'}
                            </span>
                            <span className="text-lg font-bold text-lime-green">
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
          <div className="space-y-6">
            {/* Match Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-400">{matches.upcoming?.length || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4">
                <p className="text-sm text-gray-600">Live</p>
                <p className="text-2xl font-bold text-pink">{matches.live?.length || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-forest-green">{matches.past?.length || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4">
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-500">{matches.cancelled?.length || 0}</p>
              </div>
            </div>

            {/* All Matches List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">All Matches</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((match) => (
                  <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-600">{match.round}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
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

