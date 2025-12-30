import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../services/api'

const BracketView = () => {
  const { id } = useParams()
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [] })
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

  // Group matches by round for bracket display
  const groupMatchesByRound = () => {
    const allMatches = [...matches.past, ...matches.live, ...matches.upcoming]
    const grouped = {}
    
    allMatches.forEach(match => {
      if (!grouped[match.round]) {
        grouped[match.round] = []
      }
      grouped[match.round].push(match)
    })

    // Sort rounds in order
    const roundOrder = ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final']
    const sortedRounds = Object.keys(grouped).sort((a, b) => {
      const indexA = roundOrder.indexOf(a)
      const indexB = roundOrder.indexOf(b)
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

    return { grouped, sortedRounds }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-navy-blue text-xl">Loading bracket...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to={`/tournament/${id}`} className="btn-primary">
          Back to Tournament
        </Link>
      </div>
    )
  }

  const { grouped, sortedRounds } = groupMatchesByRound()

  const MatchBracketCard = ({ match, isFinal = false }) => {
    const getStatusColor = (status) => {
      const colors = {
        live: 'border-pink border-2',
        completed: 'border-forest-green',
        upcoming: 'border-gray-300',
      }
      return colors[status] || 'border-gray-300'
    }

    return (
      <div className={`bg-white rounded-lg p-4 shadow-md ${getStatusColor(match.status)} ${isFinal ? 'ring-2 ring-lime-green' : ''}`}>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-navy-blue">
              {match.participantA?.name || 'TBD'}
            </span>
            <span className="text-lg font-bold text-lime-green">
              {match.score?.a || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-200 pt-2">
            <span className="text-sm font-semibold text-navy-blue">
              {match.participantB?.name || 'TBD'}
            </span>
            <span className="text-lg font-bold text-lime-green">
              {match.score?.b || '-'}
            </span>
          </div>
        </div>
        {match.status === 'live' && (
          <div className="mt-2 text-center">
            <span className="text-xs bg-pink text-white px-2 py-1 rounded-full animate-pulse">
              LIVE
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to={`/tournament/${id}`}
          className="text-lime-green hover:underline mb-4 inline-block"
        >
          ← Back to Tournament
        </Link>
        <h1 className="text-4xl font-bold text-navy-blue mb-2">
          {tournament?.name} - Bracket
        </h1>
        <p className="text-gray-600">Tournament bracket view</p>
      </div>

      {sortedRounds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Bracket not available yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex space-x-8 min-w-max pb-8">
            {sortedRounds.map((round, roundIndex) => (
              <div key={round} className="flex-shrink-0">
                <h3 className="text-xl font-bold text-navy-blue mb-4 text-center">
                  {round}
                </h3>
                <div className="space-y-4">
                  {grouped[round].map((match) => (
                    <MatchBracketCard
                      key={match._id}
                      match={match}
                      isFinal={round === 'Final'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BracketView

