import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../services/api'
import { getMatchParticipantName } from '../utils/participantDisplay'

const BracketView = () => {
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
      setError('Failed to load bracket')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Convert matches to bracket format
  const convertToBracketFormat = () => {
    const allMatches = [...matches.past, ...matches.live, ...matches.upcoming]
    
    // Separate group stages and knockout rounds
    const groupMatches = allMatches.filter(m => m.round?.startsWith('Group '))
    const knockoutMatches = allMatches.filter(m => !m.round?.startsWith('Group '))
    
    // Group knockout matches by round
    const knockoutByRound = {}
    knockoutMatches.forEach(match => {
      const round = match.round || 'Unknown'
      if (!knockoutByRound[round]) {
        knockoutByRound[round] = []
      }
      knockoutByRound[round].push(match)
    })

    // Sort rounds: Quarter -> Semi -> Final
    const roundOrder = ['Quarter', 'Semi', 'Final']
    const sortedRounds = Object.keys(knockoutByRound).sort((a, b) => {
      const aIndex = roundOrder.findIndex(r => a.toLowerCase().includes(r.toLowerCase()))
      const bIndex = roundOrder.findIndex(r => b.toLowerCase().includes(r.toLowerCase()))
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return {
      groupMatches,
      knockoutByRound,
      sortedRounds
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-blue text-lg font-semibold">Loading bracket...</p>
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

  const { groupMatches, knockoutByRound, sortedRounds } = convertToBracketFormat()

  const MatchBracketCard = ({ match, isFinal = false, isWinner = false }) => {
    const getStatusColor = (status) => {
      const colors = {
        live: 'border-pink border-2 shadow-pink/50',
        completed: 'border-forest-green border-2',
        upcoming: 'border-gray-300',
        cancelled: 'border-red-400 border-2',
      }
      return colors[status] || 'border-gray-300'
    }

    const isLive = match.status === 'live'
    const isCompleted = match.status === 'completed'
    const winnerA = isCompleted && match.score?.a > match.score?.b
    const winnerB = isCompleted && match.score?.b > match.score?.a

    return (
      <div className={`backdrop-blur-md rounded-xl p-3 sm:p-4 shadow-lg ${getStatusColor(match.status)} ${isFinal ? 'ring-2 ring-lime-green ring-opacity-50' : ''} ${isWinner ? 'bg-gradient-to-br from-yellow-50 to-lime-green/20' : ''} transition-all hover:shadow-xl`}>
        <div className="space-y-2">
          <div className={`flex justify-between items-center p-2 rounded-lg ${winnerA ? 'bg-lime-green/30' : ''}`}>
            <span className="text-xs sm:text-sm font-bold text-navy-blue flex-1 truncate">
              {getMatchParticipantName(match.participantA)}
            </span>
            <span className={`text-base sm:text-lg md:text-xl font-bold ml-2 ${
              isLive ? 'text-pink' : 
              isCompleted ? (winnerA ? 'text-forest-green' : 'text-gray-400') : 
              'text-gray-400'
            }`}>
              {match.score?.a || '-'}
            </span>
          </div>
          <div className={`flex justify-between items-center p-2 rounded-lg ${winnerB ? 'bg-lime-green/30' : ''}`}>
            <span className="text-xs sm:text-sm font-bold text-navy-blue flex-1 truncate">
              {getMatchParticipantName(match.participantB)}
            </span>
            <span className={`text-base sm:text-lg md:text-xl font-bold ml-2 ${
              isLive ? 'text-pink' : 
              isCompleted ? (winnerB ? 'text-forest-green' : 'text-gray-400') : 
              'text-gray-400'
            }`}>
              {match.score?.b || '-'}
            </span>
          </div>
        </div>
        {isLive && (
          <div className="mt-2 text-center">
            <span className="text-xs bg-pink text-white px-2 py-1 rounded-full animate-pulse font-semibold">
              🔴 LIVE
            </span>
          </div>
        )}
        {isCompleted && isFinal && (
          <div className="mt-2 text-center">
            <span className="text-xs bg-forest-green text-white px-2 py-1 rounded-full font-semibold">
              ✓ COMPLETED
            </span>
          </div>
        )}
      </div>
    )
  }

  // Separate group stages and knockout rounds
  const groupRounds = [...new Set(groupMatches.map(m => m.round))].sort()
  const knockoutRounds = sortedRounds

  return (
    <div className="min-h-screen ">
      {/* Header */}
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

            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-white/20 text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-navy-blue mb-2 tracking-wide">
                TOURNAMENT CUP
              </div>
              <div className="text-5xl sm:text-6xl mb-2">🏆</div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-500 mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                WINNER
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-blue">
                {tournament?.name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {groupMatches.length === 0 && knockoutRounds.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-white/20">
            <div className="text-6xl mb-4">🏸</div>
            <p className="text-gray-600 text-base sm:text-lg mb-2">Bracket not available yet.</p>
            <p className="text-gray-500 text-sm">Matches will appear here once the tournament begins</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {/* Group Stages */}
          {groupRounds.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-6 text-center">
                Group Stages
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {groupRounds.map((round) => {
                  const roundMatches = groupMatches.filter(m => m.round === round)
                  return (
                    <div key={round} className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                      <h3 className="text-lg sm:text-xl font-bold text-navy-blue mb-4 text-center bg-gradient-to-r from-lime-green/80 to-forest-green/80 text-white py-2 rounded-lg">
                        {round}
                      </h3>
                      <div className="space-y-3">
                        {roundMatches.map((match) => (
                          <MatchBracketCard key={match._id} match={match} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Knockout Bracket */}
          {knockoutRounds.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-6 text-center">
                Knockout Bracket
              </h2>
              
              {/* Custom bracket display with better mobile responsiveness */}
              <div className="overflow-x-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 min-w-max pb-8">
                  {knockoutRounds.map((round, roundIndex) => {
                    const roundMatches = knockoutByRound[round] || []
                    const isFinal = round.toLowerCase().includes('final') && !round.toLowerCase().includes('semi') && !round.toLowerCase().includes('quarter')
                    
                    return (
                      <div key={round} className="flex-shrink-0 w-full sm:w-auto">
                        {/* Round Label */}
                        <div className="mb-4 sm:mb-6">
                          <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-navy-blue text-center bg-white/80 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 shadow-lg">
                            {round.toUpperCase()}
                          </h3>
                        </div>

                        {/* Matches */}
                        <div className="space-y-3 sm:space-y-4">
                          {roundMatches.map((match, matchIndex) => {
                            const isWinner = isFinal && match.status === 'completed'
                            return (
                              <MatchBracketCard
                                key={match._id}
                                match={match}
                                isFinal={isFinal}
                                isWinner={isWinner}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Winner Display */}
          {knockoutRounds.some(r => r.toLowerCase().includes('final') && !r.toLowerCase().includes('semi') && !r.toLowerCase().includes('quarter')) && 
           knockoutByRound[knockoutRounds.find(r => r.toLowerCase().includes('final') && !r.toLowerCase().includes('semi') && !r.toLowerCase().includes('quarter'))]?.some(m => m.status === 'completed') && (
            <div className="mt-8 sm:mt-12 text-center">
              <div className="bg-gradient-to-br from-yellow-100 to-lime-green/30 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12 border-4 border-lime-green inline-block">
                <div className="text-5xl sm:text-6xl md:text-7xl mb-4">🏆</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-blue mb-2">
                  CHAMPION
                </div>
                {(() => {
                  const finalRound = knockoutRounds.find(r => r.toLowerCase().includes('final') && !r.toLowerCase().includes('semi') && !r.toLowerCase().includes('quarter'))
                  const finalMatch = knockoutByRound[finalRound]?.find(m => m.status === 'completed')
                  if (finalMatch) {
                    const winner = finalMatch.score?.a > finalMatch.score?.b 
                      ? getMatchParticipantName(finalMatch.participantA)
                      : getMatchParticipantName(finalMatch.participantB)
                    return (
                      <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-forest-green">
                        {winner || 'TBD'}
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BracketView
