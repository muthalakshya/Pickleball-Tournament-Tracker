import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const CustomMatchManager = () => {
  const { id } = useParams()
  
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Score update states - keyed by match ID
  const [matchScores, setMatchScores] = useState({})
  const [updatingMatches, setUpdatingMatches] = useState(new Set())
  
  // Other form states (less important)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [showMoreActions, setShowMoreActions] = useState(null) // Match ID for which to show more actions
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRound, setFilterRound] = useState('all')
  
  const [matchForm, setMatchForm] = useState({
    round: '',
    participantA: '',
    participantB: '',
    status: 'upcoming',
    courtNumber: '',
    order: 0
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
        adminAPI.getTournament(id),
        adminAPI.getTournamentParticipants(id),
        adminAPI.getTournamentMatches(id)
      ])
      
      setTournament(tournamentRes.data.data)
      setParticipants(participantsRes.data.data.participants || [])
      setMatches(matchesRes.data.matches || { past: [], live: [], upcoming: [], cancelled: [] })
      
      // Initialize score forms for all matches
      const allMatches = [
        ...(matchesRes.data.matches?.upcoming || []),
        ...(matchesRes.data.matches?.live || []),
        ...(matchesRes.data.matches?.past || []),
        ...(matchesRes.data.matches?.cancelled || [])
      ]
      
      const scores = {}
      allMatches.forEach(match => {
        scores[match._id] = {
          scoreA: match.score?.a || 0,
          scoreB: match.score?.b || 0
        }
      })
      setMatchScores(scores)
      
      setError('')
    } catch (err) {
      setError('Failed to load tournament data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Get max points from tournament rules
  const maxPoints = tournament?.rules?.points || 11

  // Get all matches
  const allMatches = [
    ...(matches.upcoming || []),
    ...(matches.live || []),
    ...(matches.past || []),
    ...(matches.cancelled || [])
  ]

  // Get unique rounds
  const rounds = [...new Set(allMatches.map(m => m.round))].sort()

  // Filter matches - prioritize upcoming and live
  const filteredMatches = allMatches.filter(match => {
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'upcoming' && match.status === 'upcoming') ||
      (filterStatus === 'live' && match.status === 'live') ||
      (filterStatus === 'completed' && match.status === 'completed') ||
      (filterStatus === 'cancelled' && match.status === 'cancelled')
    
    const roundMatch = filterRound === 'all' || match.round === filterRound
    
    return statusMatch && roundMatch
  })

  // Define round order: Group matches first, then Quarterfinal, Semifinal, Final
  const getRoundOrder = (round) => {
    if (round.startsWith('Group ')) {
      // Group matches come first, sorted by group letter
      return `0-${round}` // Prefix with 0 to ensure groups come first
    }
    const roundOrder = {
      'Quarterfinal': 1,
      'Quarter Finals': 1,
      'Semifinal': 2,
      'Semi Finals': 2,
      'Final': 3
    }
    // Check for exact match first
    if (roundOrder[round] !== undefined) {
      return roundOrder[round]
    }
    // Check if round contains these keywords
    if (round.toLowerCase().includes('quarter')) return 1
    if (round.toLowerCase().includes('semi')) return 2
    if (round.toLowerCase().includes('final') && !round.toLowerCase().includes('semi') && !round.toLowerCase().includes('quarter')) return 3
    // Other rounds come after
    return 4
  }

  // Sort matches: by round order first (Group -> Quarter -> Semi -> Final), then by status (live/upcoming first)
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    // First sort by round order
    const orderA = getRoundOrder(a.round)
    const orderB = getRoundOrder(b.round)
    
    if (orderA !== orderB) {
      if (typeof orderA === 'string' && typeof orderB === 'string') {
        return orderA.localeCompare(orderB)
      }
      if (typeof orderA === 'number' && typeof orderB === 'number') {
        return orderA - orderB
      }
      // String comes before number (groups first)
      if (typeof orderA === 'string') return -1
      if (typeof orderB === 'string') return 1
    }
    
    // If same round, sort by status: live first, then upcoming, then completed
    const statusOrder = { 'live': 1, 'upcoming': 2, 'completed': 3, 'cancelled': 4 }
    const statusA = statusOrder[a.status] || 5
    const statusB = statusOrder[b.status] || 5
    
    if (statusA !== statusB) {
      return statusA - statusB
    }
    
    // If same status, maintain original order
    return 0
  })

  // Handle score update - this is the PRIMARY action
  const handleScoreChange = (matchId, field, value) => {
    const numValue = parseInt(value) || 0
    if (numValue < 0) return
    if (numValue > maxPoints) {
      setError(`Score cannot exceed ${maxPoints} points`)
      setTimeout(() => setError(''), 3000)
      return
    }
    
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: numValue
      }
    }))
  }

  // Update score and auto-start match if needed, auto-complete if max points reached
  const handleUpdateScore = async (match) => {
    const matchId = match._id
    const scores = matchScores[matchId]
    
    if (!scores) return
    
    // Validate scores
    if (scores.scoreA > maxPoints || scores.scoreB > maxPoints) {
      setError(`Score cannot exceed ${maxPoints} points`)
      setTimeout(() => setError(''), 3000)
      return
    }
    
    try {
      setUpdatingMatches(prev => new Set(prev).add(matchId))
      setError('')
      setSuccess('')
      
      // Check if match should be completed (one team reached max points)
      const shouldComplete = (scores.scoreA >= maxPoints || scores.scoreB >= maxPoints) && match.status !== 'completed'
      
      // If match is upcoming and score is being set, change to live
      const shouldBeLive = match.status === 'upcoming' && (scores.scoreA > 0 || scores.scoreB > 0) && !shouldComplete
      
      if (shouldBeLive) {
        // Update status to live first
        await adminAPI.updateMatch(matchId, { status: 'live' })
      }
      
      // Update score
      await adminAPI.updateMatchScore(matchId, {
        scoreA: scores.scoreA,
        scoreB: scores.scoreB
      })
      
      // If one team reached max points, automatically complete the match
      if (shouldComplete) {
        await adminAPI.completeMatch(matchId, {
          scoreA: scores.scoreA,
          scoreB: scores.scoreB
        })
        setSuccess(`Match completed! Final score: ${scores.scoreA} - ${scores.scoreB}`)
      } else {
        setSuccess('Score updated successfully!')
      }
      
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update score')
      setTimeout(() => setError(''), 5000)
    } finally {
      setUpdatingMatches(prev => {
        const next = new Set(prev)
        next.delete(matchId)
        return next
      })
    }
  }

  // Complete match - SECONDARY important action
  const handleCompleteMatch = async (match) => {
    const matchId = match._id
    const scores = matchScores[matchId] || { scoreA: match.score?.a || 0, scoreB: match.score?.b || 0 }
    
    // Validate that one team has reached max points
    if (scores.scoreA < maxPoints && scores.scoreB < maxPoints) {
      setError(`One team must reach ${maxPoints} points to complete the match`)
      setTimeout(() => setError(''), 3000)
      return
    }
    
    if (!window.confirm(`Complete this match? Final score: ${scores.scoreA} - ${scores.scoreB}`)) return
    
    try {
      setUpdatingMatches(prev => new Set(prev).add(matchId))
      setError('')
      setSuccess('')
      
      await adminAPI.completeMatch(matchId, {
        scoreA: scores.scoreA,
        scoreB: scores.scoreB
      })
      
      setSuccess('Match completed successfully!')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete match')
      setTimeout(() => setError(''), 5000)
    } finally {
      setUpdatingMatches(prev => {
        const next = new Set(prev)
        next.delete(matchId)
        return next
      })
    }
  }

  // Less important actions - moved to icons/modals
  const handleCancelMatch = async (matchId) => {
    if (!window.confirm('Cancel this match? This action cannot be undone.')) return
    
    try {
      setError('')
      setSuccess('')
      await adminAPI.cancelMatch(matchId)
      setSuccess('Match cancelled successfully!')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel match')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Delete this match? This action cannot be undone.')) return
    
    try {
      setError('')
      setSuccess('')
      await adminAPI.deleteMatch(matchId)
      setSuccess('Match deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete match')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleCreateMatch = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setSuccess('')
      
      const matchData = {
        tournamentId: id,
        round: matchForm.round.trim(),
        participantA: matchForm.participantA || null,
        participantB: matchForm.participantB || null,
        status: matchForm.status,
        courtNumber: matchForm.courtNumber ? parseInt(matchForm.courtNumber) : null,
        order: parseInt(matchForm.order) || 0
      }

      await adminAPI.createMatch(matchData)
      setSuccess('Match created successfully!')
      setShowCreateForm(false)
      setMatchForm({
        round: '',
        participantA: '',
        participantB: '',
        status: 'upcoming',
        courtNumber: '',
        order: 0
      })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create match')
    }
  }

  const openEditForm = (match) => {
    setEditingMatch(match)
    setMatchForm({
      round: match.round || '',
      participantA: match.participantA?._id || '',
      participantB: match.participantB?._id || '',
      status: match.status || 'upcoming',
      courtNumber: match.courtNumber?.toString() || '',
      order: match.order?.toString() || '0'
    })
  }

  const handleUpdateMatch = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setSuccess('')
      
      const updateData = {
        round: matchForm.round.trim(),
        participantA: matchForm.participantA || null,
        participantB: matchForm.participantB || null,
        status: matchForm.status,
        courtNumber: matchForm.courtNumber ? parseInt(matchForm.courtNumber) : null,
        order: parseInt(matchForm.order) || 0
      }

      await adminAPI.updateMatch(editingMatch._id, updateData)
      setSuccess('Match updated successfully!')
      setEditingMatch(null)
      setMatchForm({
        round: '',
        participantA: '',
        participantB: '',
        status: 'upcoming',
        courtNumber: '',
        order: 0
      })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update match')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-navy-blue text-lg">Loading matches...</p>
        </div>
      </div>
    )
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-cream p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link to="/admin/tournaments/custom/list" className="btn-primary">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <Link
                to={`/admin/tournaments/custom/${id}/manage`}
                className="text-lime-green hover:text-forest-green text-sm mb-1 inline-block"
              >
                ← Back
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-blue">
                Score Manager
              </h1>
              {tournament && (
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  {tournament.name} • Max Points: {maxPoints}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-secondary text-xs sm:text-sm px-3 py-2 w-full sm:w-auto"
            >
              ➕ Add Match
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-2 text-xs sm:text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-2 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Simple Filters */}
          <div className="bg-white rounded-lg shadow p-2 sm:p-3 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filterRound}
                onChange={(e) => setFilterRound(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs sm:text-sm"
              >
                <option value="all">All Rounds</option>
                {rounds.map(round => (
                  <option key={round} value={round}>{round}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Matches List - Focus on Score Entry */}
        <div className="space-y-3">
          {sortedMatches.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 text-sm">No matches found.</p>
            </div>
          ) : (
            sortedMatches.map((match) => {
              const scores = matchScores[match._id] || { scoreA: match.score?.a || 0, scoreB: match.score?.b || 0 }
              const isUpdating = updatingMatches.has(match._id)
              const canComplete = (scores.scoreA >= maxPoints || scores.scoreB >= maxPoints) && match.status !== 'completed'
              const isCompleted = match.status === 'completed'
              const isCancelled = match.status === 'cancelled'
              
              return (
                <div
                  key={match._id}
                  className={`bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 ${
                    match.status === 'live' ? 'border-pink' :
                    match.status === 'completed' ? 'border-forest-green' :
                    match.status === 'cancelled' ? 'border-gray-400' :
                    'border-lime-green'
                  }`}
                >
                  {/* Match Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-navy-blue text-sm sm:text-base">
                          {match.round}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          match.status === 'live' ? 'bg-pink text-white' :
                          match.status === 'completed' ? 'bg-forest-green text-white' :
                          match.status === 'cancelled' ? 'bg-gray-400 text-white' :
                          'bg-lime-green text-navy-blue'
                        }`}>
                          {match.status.toUpperCase()}
                        </span>
                        {match.courtNumber && (
                          <span className="text-xs text-gray-500">Court {match.courtNumber}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {match.participantA?.name || 'TBD'} vs {match.participantB?.name || 'TBD'}
                      </div>
                    </div>
                    
                    {/* More Actions Icon (Less Important) */}
                    {!isCompleted && !isCancelled && (
                      <div className="relative">
                        <button
                          onClick={() => setShowMoreActions(showMoreActions === match._id ? null : match._id)}
                          className="text-gray-400 hover:text-navy-blue p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        
                        {showMoreActions === match._id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border z-10 min-w-[120px]">
                            <button
                              onClick={() => {
                                openEditForm(match)
                                setShowMoreActions(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => {
                                handleCancelMatch(match._id)
                                setShowMoreActions(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
                            >
                              🚫 Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteMatch(match._id)
                                setShowMoreActions(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Score Entry - PRIMARY FEATURE */}
                  {!isCompleted && !isCancelled && (() => {
                    const bothTBD = !match.participantA && !match.participantB
                    
                    return (
                      <div className="space-y-3">
                        {bothTBD ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                            <p className="text-xs sm:text-sm text-yellow-800">
                              ⚠️ Both teams are TBD. Please assign participants before entering scores.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Score Inputs */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-navy-blue mb-1">
                                  {match.participantA?.name || 'Team A (TBD)'}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={maxPoints}
                                  value={scores.scoreA}
                                  onChange={(e) => handleScoreChange(match._id, 'scoreA', e.target.value)}
                                  disabled={isUpdating || !match.participantA}
                                  className={`w-full px-3 py-2 border-2 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-lime-green focus:border-lime-green ${
                                    !match.participantA 
                                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60' 
                                      : 'border-lime-green'
                                  }`}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-navy-blue mb-1">
                                  {match.participantB?.name || 'Team B (TBD)'}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={maxPoints}
                                  value={scores.scoreB}
                                  onChange={(e) => handleScoreChange(match._id, 'scoreB', e.target.value)}
                                  disabled={isUpdating || !match.participantB}
                                  className={`w-full px-3 py-2 border-2 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-lime-green focus:border-lime-green ${
                                    !match.participantB 
                                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60' 
                                      : 'border-lime-green'
                                  }`}
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            {/* Action Button - Auto-completes if max points reached */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateScore(match)}
                                disabled={isUpdating || bothTBD}
                                className="flex-1 btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUpdating ? 'Updating...' : canComplete ? '💾 Update & Complete' : '💾 Update Score'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()}

                  {/* Completed Match Display */}
                  {(isCompleted || isCancelled) && (
                    <div className="text-center py-2">
                      <div className="text-2xl sm:text-3xl font-bold text-navy-blue">
                        {match.score?.a || 0} - {match.score?.b || 0}
                      </div>
                      {isCompleted && match.score?.a !== match.score?.b && (
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">
                          Winner: {match.score?.a > match.score?.b 
                            ? match.participantA?.name || 'Team A'
                            : match.participantB?.name || 'Team B'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="bg-white rounded-lg shadow p-2 text-center">
            <div className="text-lg font-bold text-navy-blue">{matches.upcoming?.length || 0}</div>
            <div className="text-xs text-gray-600">Upcoming</div>
          </div>
          <div className="bg-white rounded-lg shadow p-2 text-center">
            <div className="text-lg font-bold text-pink">{matches.live?.length || 0}</div>
            <div className="text-xs text-gray-600">Live</div>
          </div>
          <div className="bg-white rounded-lg shadow p-2 text-center">
            <div className="text-lg font-bold text-forest-green">{matches.past?.length || 0}</div>
            <div className="text-xs text-gray-600">Done</div>
          </div>
          <div className="bg-white rounded-lg shadow p-2 text-center">
            <div className="text-lg font-bold text-gray-600">{matches.cancelled?.length || 0}</div>
            <div className="text-xs text-gray-600">Cancelled</div>
          </div>
        </div>

        {/* Create Match Modal (Less Important) */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h2 className="text-xl font-bold text-navy-blue mb-4">Create New Match</h2>
                
                <form onSubmit={handleCreateMatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-1">
                      Round <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={matchForm.round}
                      onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      placeholder="e.g., Round 1, Quarterfinal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Participant A
                      </label>
                      <select
                        value={matchForm.participantA}
                        onChange={(e) => setMatchForm({ ...matchForm, participantA: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      >
                        <option value="">Select A</option>
                        {participants.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Participant B
                      </label>
                      <select
                        value={matchForm.participantB}
                        onChange={(e) => setMatchForm({ ...matchForm, participantB: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      >
                        <option value="">Select B</option>
                        {participants.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Court Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={matchForm.courtNumber}
                        onChange={(e) => setMatchForm({ ...matchForm, courtNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={matchForm.order}
                        onChange={(e) => setMatchForm({ ...matchForm, order: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 btn-primary text-sm"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false)
                        setMatchForm({
                          round: '',
                          participantA: '',
                          participantB: '',
                          status: 'upcoming',
                          courtNumber: '',
                          order: 0
                        })
                      }}
                      className="flex-1 btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Match Modal (Less Important) */}
        {editingMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h2 className="text-xl font-bold text-navy-blue mb-4">Edit Match</h2>
                
                <form onSubmit={handleUpdateMatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-1">
                      Round <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={matchForm.round}
                      onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Participant A
                      </label>
                      <select
                        value={matchForm.participantA}
                        onChange={(e) => setMatchForm({ ...matchForm, participantA: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      >
                        <option value="">Select A</option>
                        {participants.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Participant B
                      </label>
                      <select
                        value={matchForm.participantB}
                        onChange={(e) => setMatchForm({ ...matchForm, participantB: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      >
                        <option value="">Select B</option>
                        {participants.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Status
                      </label>
                      <select
                        value={matchForm.status}
                        onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-1">
                        Court Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={matchForm.courtNumber}
                        onChange={(e) => setMatchForm({ ...matchForm, courtNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green text-sm"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 btn-primary text-sm"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMatch(null)
                        setMatchForm({
                          round: '',
                          participantA: '',
                          participantB: '',
                          status: 'upcoming',
                          courtNumber: '',
                          order: 0
                        })
                      }}
                      className="flex-1 btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomMatchManager
