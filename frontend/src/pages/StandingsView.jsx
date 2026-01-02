import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../services/api'
import { getParticipantDisplayName } from '../utils/participantDisplay'

const StandingsView = () => {
  const { id } = useParams()
  const [standings, setStandings] = useState([])
  const [groupStandings, setGroupStandings] = useState([])
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStage, setSelectedStage] = useState('all')

  useEffect(() => {
    fetchStandings()
    fetchGroupStandings()
    fetchMatches()
  }, [id])

  const fetchStandings = async () => {
    try {
      const response = await publicAPI.getTournamentStandings(id)
      setStandings(response.data.standings || [])
      setTournament(response.data.tournament)
      setError(null)
    } catch (err) {
      console.error('Failed to load standings:', err)
    }
  }

  const fetchGroupStandings = async () => {
    try {
      const response = await publicAPI.getTournamentGroupStandings(id)
      setGroupStandings(response.data.groupStandings || [])
    } catch (err) {
      // Not all tournaments have groups, so this is optional
      console.log('No group standings available')
    }
  }

  const fetchMatches = async () => {
    try {
      const response = await publicAPI.getTournamentMatches(id)
      setMatches(response.data.matches || { past: [], live: [], upcoming: [], cancelled: [] })
    } catch (err) {
      console.error('Failed to load matches for stage filtering')
    } finally {
      setLoading(false)
    }
  }

  // Get all matches to determine available stages
  const allMatches = [
    ...(matches.upcoming || []),
    ...(matches.live || []),
    ...(matches.past || []),
    ...(matches.cancelled || [])
  ]

  // Extract unique stages/rounds
  const availableStages = ['all']
  const stageSet = new Set()
  allMatches.forEach(match => {
    const round = match.round || ''
    if (round.startsWith('Group ')) {
      stageSet.add('Stage 1')
    } else if (round.toLowerCase().includes('quarter')) {
      stageSet.add('Quarterfinal')
    } else if (round.toLowerCase().includes('semi')) {
      stageSet.add('Semifinal')
    } else if (round.toLowerCase().includes('final') && !round.toLowerCase().includes('semi') && !round.toLowerCase().includes('quarter')) {
      stageSet.add('Final')
    }
  })
  availableStages.push(...Array.from(stageSet))

  // Filter standings by stage
  const getFilteredStandings = () => {
    if (selectedStage === 'all') return standings

    // For group stage, return group standings
    if (selectedStage === 'Stage 1') {
      return null // Will show group tables instead
    }

    // For knockout stages, filter by participants in those rounds
    const stageRounds = {
      'Quarterfinal': ['quarter', 'quarterfinal'],
      'Semifinal': ['semi', 'semifinal'],
      'Final': ['final']
    }

    const relevantRounds = stageRounds[selectedStage] || []
    const stageMatches = allMatches.filter(m => {
      const round = (m.round || '').toLowerCase()
      return relevantRounds.some(r => round.includes(r))
    })

    const stageParticipantIds = new Set()
    stageMatches.forEach(m => {
      if (m.participantA) stageParticipantIds.add(m.participantA._id || m.participantA)
      if (m.participantB) stageParticipantIds.add(m.participantB._id || m.participantB)
    })

    return standings.filter(s => stageParticipantIds.has(s.participant.id))
  }

  const filteredStandings = getFilteredStandings()
  const showGroupStandings = selectedStage === 'Stage 1' && groupStandings.length > 0
  
  // Check if we have any standings available (regular or group)
  const hasStandings = (standings && standings.length > 0) || (groupStandings && groupStandings.length > 0)
  const hasFilteredStandings = filteredStandings && filteredStandings.length > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-blue text-lg font-semibold">Loading standings...</p>
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

  const StandingsTable = ({ standingsData, title }) => (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20">
      {title && (
        <div className="bg-gradient-to-r from-lime-green/80 to-forest-green/80 p-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/20">
          <thead className="bg-white/40 backdrop-blur-sm">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-navy-blue uppercase">Rank</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-navy-blue uppercase">Participant</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase">Matches</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase">Wins</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase hidden sm:table-cell">Losses</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase hidden md:table-cell">Points For</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase hidden md:table-cell">Points Against</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase">Difference</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-navy-blue uppercase hidden lg:table-cell">Win Rate</th>
            </tr>
          </thead>
          <tbody className="bg-white/40 backdrop-blur-sm divide-y divide-white/20">
            {standingsData.map((standing, index) => (
              <tr 
                key={standing.participant.id} 
                className={`hover:bg-white/60 transition-colors ${
                  index === 0 ? 'bg-lime-green/20' : ''
                }`}
              >
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {index === 0 && (
                      <span className="text-yellow-500 mr-2 text-lg sm:text-xl">🏆</span>
                    )}
                    <span className={`text-sm sm:text-base font-bold ${
                      index === 0 ? 'text-lime-green' : 'text-navy-blue'
                    }`}>
                      {standing.position}
                    </span>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-sm sm:text-base font-semibold text-navy-blue">
                    {getParticipantDisplayName(standing.participant)}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  <span className="text-sm sm:text-base text-gray-700 font-semibold">
                    {standing.stats.matchesPlayed}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  <span className="text-sm sm:text-base font-bold text-forest-green">
                    {standing.stats.wins}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden sm:table-cell">
                  <span className="text-sm sm:text-base font-semibold text-red-600">
                    {standing.stats.losses}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden md:table-cell">
                  <span className="text-sm sm:text-base text-gray-700">
                    {standing.stats.pointsFor}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden md:table-cell">
                  <span className="text-sm sm:text-base text-gray-700">
                    {standing.stats.pointsAgainst}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  <span className={`text-sm sm:text-base font-bold ${
                    standing.stats.pointDifference >= 0 
                      ? 'text-forest-green' 
                      : 'text-red-600'
                  }`}>
                    {standing.stats.pointDifference >= 0 ? '+' : ''}
                    {standing.stats.pointDifference}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden lg:table-cell">
                  <span className="text-sm sm:text-base text-gray-700">
                    {standing.stats.winRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

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
                {tournament?.name} - Standings
              </h1>
              
              {/* Stage Filter Dropdown */}
              {availableStages.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-navy-blue mb-2">
                    Filter by Stage:
                  </label>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="bg-white/80 backdrop-blur-sm border-2 border-lime-green rounded-xl px-4 py-2 text-navy-blue font-semibold focus:outline-none focus:ring-2 focus:ring-lime-green focus:border-transparent w-full sm:w-auto"
                  >
                    {availableStages.map(stage => (
                      <option key={stage} value={stage}>
                        {stage === 'all' ? 'All Stages' : stage}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-gray-600 text-sm sm:text-base">
                Point table and tournament statistics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {showGroupStandings ? (
          // Show Group-wise Standings for Stage 1
          <div className="space-y-6 sm:space-y-8">
            {groupStandings.map((group) => (
              <StandingsTable
                key={group.groupName}
                standingsData={group.standings}
                title={`Group ${group.groupName}`}
              />
            ))}
          </div>
        ) : hasFilteredStandings ? (
          // Show filtered standings when available
          <StandingsTable standingsData={filteredStandings} />
        ) : hasStandings && selectedStage !== 'all' ? (
          // If we have standings but filtered view is empty, show all standings with a note
          <div className="space-y-4">
            <div className="bg-yellow-50/80 backdrop-blur-sm border-2 border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> No standings available for the selected stage. Showing all standings below.
              </p>
            </div>
            {standings.length > 0 && (
              <StandingsTable standingsData={standings} />
            )}
          </div>
        ) : hasStandings ? (
          // Show all standings when available
          <StandingsTable standingsData={standings} />
        ) : (
          // Only show "no standings" message when truly no standings exist
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-white/20">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600 text-base sm:text-lg mb-2">No standings available yet.</p>
            <p className="text-gray-500 text-sm">
              Standings will appear once matches are completed.
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
            <h3 className="text-lg sm:text-xl font-bold text-navy-blue mb-3">Tournament Info</h3>
            {tournament && (
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Format:</span>
                  <span className="text-navy-blue capitalize">{tournament.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Type:</span>
                  <span className="text-navy-blue capitalize">{tournament.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span className="text-navy-blue capitalize">{tournament.status}</span>
                </div>
                {tournament.currentRound && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Current Round:</span>
                    <span className="text-navy-blue">{tournament.currentRound}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
            <h3 className="text-lg sm:text-xl font-bold text-navy-blue mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link
                to={`/tournament/${id}/matches`}
                className="block bg-gradient-to-r from-lime-green to-forest-green text-white hover:from-lime-green/90 hover:to-forest-green/90 rounded-xl p-3 text-center font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                View All Matches
              </Link>
              <Link
                to={`/tournament/${id}/bracket`}
                className="block bg-gradient-to-r from-pink to-lime-green text-white hover:from-pink/90 hover:to-lime-green/90 rounded-xl p-3 text-center font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                View Bracket
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StandingsView
