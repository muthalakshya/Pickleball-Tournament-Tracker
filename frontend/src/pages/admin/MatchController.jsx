import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI, publicAPI } from '../../services/api'

const MatchController = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingMatch, setEditingMatch] = useState(null)
  const [completingMatch, setCompletingMatch] = useState(false)
  const [creatingMatch, setCreatingMatch] = useState(false)
  const [scoreForm, setScoreForm] = useState({ scoreA: 0, scoreB: 0 })
  const [matchForm, setMatchForm] = useState({
    round: '',
    participantA: '',
    participantB: '',
    status: 'upcoming',
    courtNumber: '',
    order: 0
  })

  useEffect(() => {
    fetchMatches()
    fetchParticipants()
  }, [id])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      // Use admin API to get matches for all tournaments (including unpublished)
      const response = await adminAPI.getTournamentMatches(id)
      setMatches(response.data.matches)
      setTournament(response.data.tournament)
    } catch (err) {
      console.error('Failed to load matches:', err)
      alert(err.response?.data?.message || 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      const response = await adminAPI.getTournamentParticipants(id)
      setParticipants(response.data.data.participants || [])
    } catch (err) {
      console.error('Failed to load participants:', err)
    }
  }

  const handleStartMatch = async (matchId) => {
    try {
      await adminAPI.updateMatchScore(matchId, { status: 'live' })
      fetchMatches()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start match')
    }
  }

  const handleUpdateScore = async (matchId) => {
    try {
      await adminAPI.updateMatchScore(matchId, {
        scoreA: parseInt(scoreForm.scoreA),
        scoreB: parseInt(scoreForm.scoreB),
        status: 'live'
      })
      setEditingMatch(null)
      fetchMatches()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update score')
    }
  }

  const handleCompleteMatch = async (matchId) => {
    try {
      const scoreA = parseInt(scoreForm.scoreA)
      const scoreB = parseInt(scoreForm.scoreB)
      
      // Validation
      if (scoreA === scoreB) {
        alert('Match cannot end in a draw. Scores must be different.')
        return
      }
      
      if (scoreA < 0 || scoreB < 0) {
        alert('Scores cannot be negative.')
        return
      }
      
      await adminAPI.completeMatch(matchId, {
        scoreA,
        scoreB
      })
      setEditingMatch(null)
      setCompletingMatch(false)
      fetchMatches()
      alert('Match completed successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete match')
    }
  }

  const openEditModal = (match, action = 'update') => {
    setEditingMatch(match)
    setCompletingMatch(action === 'complete')
    setScoreForm({
      scoreA: match.score?.a || 0,
      scoreB: match.score?.b || 0
    })
  }

  const openCreateModal = () => {
    setCreatingMatch(true)
    setMatchForm({
      round: tournament?.currentRound || '',
      participantA: '',
      participantB: '',
      status: 'upcoming',
      courtNumber: '',
      order: 0
    })
  }

  const openUpdateModal = (match) => {
    setEditingMatch(match)
    setCreatingMatch(false)
    setMatchForm({
      round: match.round || '',
      participantA: match.participantA?._id || '',
      participantB: match.participantB?._id || '',
      status: match.status || 'upcoming',
      courtNumber: match.courtNumber || '',
      order: match.order || 0
    })
    setScoreForm({
      scoreA: match.score?.a || 0,
      scoreB: match.score?.b || 0
    })
  }

  const handleCreateMatch = async () => {
    try {
      if (!matchForm.round) {
        alert('Please fill in the round field')
        return
      }

      // Allow TBD (null) participants for knockout brackets
      // But if both are set, they must be different
      if (matchForm.participantA && matchForm.participantB && matchForm.participantA === matchForm.participantB) {
        alert('Participants must be different')
        return
      }

      await adminAPI.createMatch({
        tournamentId: id,
        round: matchForm.round,
        participantA: matchForm.participantA,
        participantB: matchForm.participantB,
        status: matchForm.status,
        courtNumber: matchForm.courtNumber ? parseInt(matchForm.courtNumber) : null,
        order: parseInt(matchForm.order) || 0
      })
      
      setCreatingMatch(false)
      fetchMatches()
      alert('Match created successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create match')
    }
  }

  const handleUpdateMatch = async () => {
    try {
      if (!matchForm.round) {
        alert('Please fill in the round field')
        return
      }

      // Allow TBD (null) participants for knockout brackets
      // But if both are set, they must be different
      if (matchForm.participantA && matchForm.participantB && matchForm.participantA === matchForm.participantB) {
        alert('Participants must be different')
        return
      }

      await adminAPI.updateMatch(editingMatch._id, {
        round: matchForm.round,
        participantA: matchForm.participantA,
        participantB: matchForm.participantB,
        status: matchForm.status,
        courtNumber: matchForm.courtNumber ? parseInt(matchForm.courtNumber) : null,
        order: parseInt(matchForm.order) || 0,
        scoreA: parseInt(scoreForm.scoreA) || 0,
        scoreB: parseInt(scoreForm.scoreB) || 0
      })
      
      setEditingMatch(null)
      fetchMatches()
      alert('Match updated successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update match')
    }
  }

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return
    }

    try {
      await adminAPI.deleteMatch(matchId)
      fetchMatches()
      alert('Match deleted successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete match')
    }
  }

  const handleCancelMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to cancel this match? It will be marked as cancelled.')) {
      return
    }

    try {
      await adminAPI.cancelMatch(matchId)
      fetchMatches()
      alert('Match cancelled successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel match')
    }
  }

  const MatchCard = ({ match }) => {
    return (
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-navy-blue">{match.round}</h3>
            {match.courtNumber && (
              <p className="text-sm text-gray-600">Court {match.courtNumber}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            match.status === 'live' ? 'bg-pink text-white animate-pulse' :
            match.status === 'completed' ? 'bg-forest-green text-white' :
            match.status === 'cancelled' ? 'bg-red-500 text-white' :
            'bg-gray-400 text-white'
          }`}>
            {match.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <p className={`font-semibold ${!match.participantA ? 'text-gray-400 italic' : 'text-navy-blue'}`}>
                {match.participantA?.name || 'TBD (To Be Declared)'}
              </p>
              {match.participantA?.players && (
                <p className="text-sm text-gray-600">
                  {match.participantA.players.join(' & ')}
                </p>
              )}
            </div>
            <div className="text-2xl font-bold text-lime-green mx-4">
              {match.score?.a || 0}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
            <div className="flex-1">
              <p className={`font-semibold ${!match.participantB ? 'text-gray-400 italic' : 'text-navy-blue'}`}>
                {match.participantB?.name || 'TBD (To Be Declared)'}
              </p>
              {match.participantB?.players && (
                <p className="text-sm text-gray-600">
                  {match.participantB.players.join(' & ')}
                </p>
              )}
            </div>
            <div className="text-2xl font-bold text-lime-green mx-4">
              {match.score?.b || 0}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            {match.status === 'upcoming' && (
              <button
                onClick={() => handleStartMatch(match._id)}
                className="flex-1 btn-primary text-sm"
              >
                Start Match
              </button>
            )}
            {match.status === 'live' && (
              <>
                <button
                  onClick={() => openEditModal(match)}
                  className="flex-1 btn-secondary text-sm"
                >
                  Update Score
                </button>
                <button
                  onClick={() => openEditModal(match, 'complete')}
                  className="flex-1 bg-forest-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Complete Match
                </button>
              </>
            )}
          {match.status === 'upcoming' && (
            <button
              onClick={() => openUpdateModal(match)}
              className="flex-1 btn-secondary text-sm"
            >
              Edit Match
            </button>
          )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openUpdateModal(match)}
              className="flex-1 bg-lime-green text-navy-blue hover:bg-forest-green hover:text-white px-3 py-1 rounded text-xs font-semibold"
            >
              Edit
            </button>
            {match.status !== 'completed' && match.status !== 'cancelled' && (
              <button
                onClick={() => handleCancelMatch(match._id)}
                className="flex-1 bg-yellow-500 text-white hover:bg-yellow-600 px-3 py-1 rounded text-xs font-semibold"
              >
                Cancel
              </button>
            )}
            {match.status === 'cancelled' && (
              <button
                onClick={async () => {
                  try {
                    await adminAPI.updateMatch(match._id, { status: 'upcoming' })
                    fetchMatches()
                    alert('Match reactivated successfully!')
                  } catch (err) {
                    alert(err.response?.data?.message || 'Failed to reactivate match')
                  }
                }}
                className="flex-1 bg-lime-green text-white hover:bg-forest-green px-3 py-1 rounded text-xs font-semibold"
              >
                Reactivate
              </button>
            )}
            <button
              onClick={() => handleDeleteMatch(match._id)}
              className="flex-1 bg-red-500 text-white hover:bg-red-600 px-3 py-1 rounded text-xs font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="text-lime-green hover:underline mb-4 inline-block"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold text-navy-blue mb-2">
          {tournament?.name} - Match Control
        </h1>
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-4 text-sm">
            <span className="px-3 py-1 bg-pink text-white rounded-full">
              Live: {matches.live.length}
            </span>
            <span className="px-3 py-1 bg-forest-green text-white rounded-full">
              Completed: {matches.past.length}
            </span>
            <span className="px-3 py-1 bg-gray-400 text-white rounded-full">
              Upcoming: {matches.upcoming.length}
            </span>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary"
          >
            + Create Match
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading matches...</div>
      ) : (
        <>
          {/* Live Matches */}
          {matches.live.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-navy-blue mb-4 flex items-center">
                <span className="w-3 h-3 bg-pink rounded-full mr-2 animate-pulse"></span>
                Live Matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.live.map((match) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Matches */}
          {matches.upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Upcoming Matches</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.upcoming.map((match) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Past Matches */}
          {matches.past.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Past Matches</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.past.map((match) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Matches */}
          {matches.cancelled && matches.cancelled.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Cancelled Matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.cancelled.map((match) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Update Match Modal */}
      {(creatingMatch || (editingMatch && !completingMatch && editingMatch.status !== 'live')) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-navy-blue mb-4">
              {creatingMatch ? 'Create New Match' : 'Update Match'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Round <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={matchForm.round}
                  onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}
                  placeholder="e.g., Quarter Finals, Group A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Participant A <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={matchForm.participantA || ''}
                  onChange={(e) => setMatchForm({ ...matchForm, participantA: e.target.value || null })}
                >
                  <option value="">TBD (To Be Declared)</option>
                  {participants.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.players && p.players.length > 0 && `(${p.players.join(' & ')})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Participant B <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={matchForm.participantB || ''}
                  onChange={(e) => setMatchForm({ ...matchForm, participantB: e.target.value || null })}
                >
                  <option value="">TBD (To Be Declared)</option>
                  {participants.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.players && p.players.length > 0 && `(${p.players.join(' & ')})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-blue mb-2">
                    Status
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                    value={matchForm.status}
                    onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value })}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-blue mb-2">
                    Court Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                    value={matchForm.courtNumber}
                    onChange={(e) => setMatchForm({ ...matchForm, courtNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Order
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={matchForm.order}
                  onChange={(e) => setMatchForm({ ...matchForm, order: e.target.value })}
                />
              </div>
              {!creatingMatch && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Score A
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                      value={scoreForm.scoreA}
                      onChange={(e) => setScoreForm({ ...scoreForm, scoreA: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Score B
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                      value={scoreForm.scoreB}
                      onChange={(e) => setScoreForm({ ...scoreForm, scoreB: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => creatingMatch ? handleCreateMatch() : handleUpdateMatch()}
                className="flex-1 btn-primary"
              >
                {creatingMatch ? 'Create Match' : 'Update Match'}
              </button>
              <button
                onClick={() => {
                  setCreatingMatch(false)
                  setEditingMatch(null)
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-navy-blue hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Score Modal (for live matches) */}
      {editingMatch && !creatingMatch && !completingMatch && editingMatch.status === 'live' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-navy-blue mb-4">Update Match Score</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  {editingMatch.participantA?.name}
                  {editingMatch.participantA?.players && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({editingMatch.participantA.players.join(' & ')})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={scoreForm.scoreA}
                  onChange={(e) => setScoreForm({ ...scoreForm, scoreA: e.target.value })}
                  placeholder="Enter score"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  {editingMatch.participantB?.name}
                  {editingMatch.participantB?.players && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({editingMatch.participantB.players.join(' & ')})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={scoreForm.scoreB}
                  onChange={(e) => setScoreForm({ ...scoreForm, scoreB: e.target.value })}
                  placeholder="Enter score"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleUpdateScore(editingMatch._id)}
                className="flex-1 btn-primary"
              >
                Update Score
              </button>
              <button
                onClick={() => {
                  setEditingMatch(null)
                  setCompletingMatch(false)
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-navy-blue hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Match Modal */}
      {editingMatch && completingMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-navy-blue mb-4">Complete Match</h3>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Enter the final scores. The match will be marked as completed and tournament progression will be processed.
              </p>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  {editingMatch.participantA?.name}
                  {editingMatch.participantA?.players && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({editingMatch.participantA.players.join(' & ')})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={scoreForm.scoreA}
                  onChange={(e) => setScoreForm({ ...scoreForm, scoreA: e.target.value })}
                  placeholder="Enter score"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  {editingMatch.participantB?.name}
                  {editingMatch.participantB?.players && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({editingMatch.participantB.players.join(' & ')})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={scoreForm.scoreB}
                  onChange={(e) => setScoreForm({ ...scoreForm, scoreB: e.target.value })}
                  placeholder="Enter score"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleCompleteMatch(editingMatch._id)}
                className="flex-1 bg-forest-green text-white hover:bg-green-700 px-4 py-2 rounded-lg font-semibold"
              >
                Complete Match
              </button>
              <button
                onClick={() => {
                  setEditingMatch(null)
                  setCompletingMatch(false)
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-navy-blue hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchController

