import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const CustomTournamentManage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // overview, players, fixtures

  // Form states
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false)
  const [playerForm, setPlayerForm] = useState({
    name: '',
    player1: '',
    player2: ''
  })
  const [uploadFile, setUploadFile] = useState(null)

  useEffect(() => {
    fetchTournamentData()
  }, [id])

  const fetchTournamentData = async () => {
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
      setError('')
    } catch (err) {
      setError('Failed to load tournament data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await adminAPI.updateTournamentStatus(id, { status: newStatus })
      fetchTournamentData()
      alert(`Tournament status updated to ${newStatus}`)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleTogglePublic = async () => {
    try {
      await adminAPI.toggleTournamentPublic(id)
      fetchTournamentData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update visibility')
    }
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    
    if (!playerForm.name || !playerForm.player1) {
      alert('Name and Player 1 are required')
      return
    }

    if (tournament.type === 'doubles' && !playerForm.player2) {
      alert('Player 2 is required for doubles tournaments')
      return
    }

    try {
      const participantData = {
        name: playerForm.name,
        players: tournament.type === 'doubles' 
          ? [playerForm.player1, playerForm.player2]
          : [playerForm.player1]
      }

      await adminAPI.createParticipant(id, participantData)
      setPlayerForm({ name: '', player1: '', player2: '' })
      setShowAddPlayerForm(false)
      fetchTournamentData()
      alert('Player added successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add player')
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      alert('Please select a file')
      return
    }

    try {
      await adminAPI.uploadParticipants(id, uploadFile)
      setUploadFile(null)
      fetchTournamentData()
      alert('Participants uploaded successfully!')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to upload participants'
      if (err.response?.data?.errors) {
        alert(`${errorMsg}\n\nErrors:\n${err.response.data.errors.join('\n')}`)
      } else {
        alert(errorMsg)
      }
    }
  }

  const handleGenerateFixtures = async () => {
    if (participants.length < 2) {
      alert('At least 2 participants are required to generate fixtures')
      return
    }

    // For custom tournaments, redirect to matches page for manual creation
    if (tournament.format === 'custom') {
      navigate(`/admin/tournaments/${id}/matches`)
      return
    }

    if (!window.confirm('This will generate fixtures for all participants. Continue?')) {
      return
    }

    try {
      await adminAPI.generateFixtures(id, {})
      fetchTournamentData()
      alert('Fixtures generated successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate fixtures')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-400 text-white',
      comingSoon: 'bg-blue-500 text-white',
      live: 'bg-pink text-white animate-pulse',
      delayed: 'bg-yellow-500 text-white',
      completed: 'bg-forest-green text-white',
      cancelled: 'bg-red-500 text-white'
    }
    return badges[status] || 'bg-gray-400 text-white'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading tournament...</p>
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

  const totalMatches = (matches.past?.length || 0) + (matches.live?.length || 0) + (matches.upcoming?.length || 0) + (matches.cancelled?.length || 0)

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-navy-blue mb-2">{tournament.name}</h1>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(tournament.status)}`}>
                  {tournament.status.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  tournament.isPublic ? 'bg-lime-green bg-opacity-20 text-forest-green' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tournament.isPublic ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            <Link
              to="/admin/tournaments/custom/list"
              className="text-navy-blue hover:text-forest-green font-semibold"
            >
              ← Back to List
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'players'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              Players ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'fixtures'
                  ? 'border-lime-green text-lime-green'
                  : 'border-transparent text-gray-600 hover:text-navy-blue'
              }`}
            >
              Fixtures ({totalMatches} matches)
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Tournament Info Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Tournament Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-semibold text-navy-blue">{tournament.location || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold text-navy-blue">
                    {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-semibold text-navy-blue capitalize">{tournament.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Points to Win</p>
                  <p className="font-semibold text-navy-blue">{tournament.rules?.points || 11} Points</p>
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Status Management</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-blue mb-2">Tournament Status</label>
                  <select
                    value={tournament.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  >
                    <option value="draft">Draft</option>
                    <option value="comingSoon">Coming Soon</option>
                    <option value="live">Live</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tournament.isPublic}
                      onChange={handleTogglePublic}
                      className="mr-2 w-4 h-4 text-lime-green focus:ring-lime-green border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-navy-blue">
                      Publish Tournament (Make it publicly visible)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Delete Tournament */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Danger Zone</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Once you delete a tournament, there is no going back. Please be certain.
                </p>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone and will delete all associated matches and participants.`)) {
                      return
                    }

                    // Additional confirmation
                    if (!window.confirm('This is your last chance. Are you absolutely sure?')) {
                      return
                    }

                    // Check if tournament is live
                    if (tournament.status === 'live') {
                      alert('Cannot delete a live tournament. Please complete or cancel it first.')
                      return
                    }

                    try {
                      await adminAPI.deleteTournament(id)
                      alert('Tournament deleted successfully!')
                      navigate('/admin/tournaments/custom/list')
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to delete tournament')
                    }
                  }}
                  className="bg-red-600 text-white hover:bg-red-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                  disabled={tournament.status === 'live'}
                >
                  Delete Tournament
                </button>
                {tournament.status === 'live' && (
                  <p className="text-xs text-red-600 mt-2">
                    Cannot delete a live tournament. Please complete or cancel it first.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-navy-blue mb-2">Participants</h3>
                <p className="text-3xl font-bold text-lime-green">{participants.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-navy-blue mb-2">Total Matches</h3>
                <p className="text-3xl font-bold text-pink">{totalMatches}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-navy-blue mb-2">Live Matches</h3>
                <p className="text-3xl font-bold text-forest-green">{matches.live?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Add Player Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-navy-blue">Add Players</h2>
                <button
                  onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
                  className="btn-secondary"
                >
                  {showAddPlayerForm ? 'Cancel' : '+ Add Player Manually'}
                </button>
              </div>

              {/* Manual Add Form */}
              {showAddPlayerForm && (
                <form onSubmit={handleAddPlayer} className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-2">
                        Team/Player Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={playerForm.name}
                        onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-blue mb-2">
                        Player 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={playerForm.player1}
                        onChange={(e) => setPlayerForm({ ...playerForm, player1: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                        required
                      />
                    </div>
                    {tournament.type === 'doubles' && (
                      <div>
                        <label className="block text-sm font-medium text-navy-blue mb-2">
                          Player 2 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={playerForm.player2}
                          onChange={(e) => setPlayerForm({ ...playerForm, player2: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <button type="submit" className="btn-primary">
                      Add Player
                    </button>
                  </div>
                </form>
              )}

              {/* Excel Upload */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-navy-blue mb-4">Upload via Excel/CSV</h3>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      For {tournament.type === 'singles' ? 'singles' : 'doubles'}: CSV format with columns: name, player1{tournament.type === 'doubles' ? ', player2' : ''}
                    </p>
                  </div>
                  <button type="submit" className="btn-primary" disabled={!uploadFile}>
                    Upload Participants
                  </button>
                </form>
              </div>
            </div>

            {/* Players List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Current Players ({participants.length})</h2>
              {participants.length === 0 ? (
                <p className="text-gray-600">No players added yet. Add players using the form above.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant) => (
                    <div key={participant._id} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete "${participant.name}"? This action cannot be undone.`)) {
                            return
                          }

                          try {
                            await adminAPI.deleteParticipant(id, participant._id)
                            fetchTournamentData()
                            alert('Player deleted successfully!')
                          } catch (err) {
                            const errorMsg = err.response?.data?.message || 'Failed to delete player'
                            if (err.response?.data?.matchesCount) {
                              alert(`${errorMsg}\n\nThis player is involved in ${err.response.data.matchesCount} match(es). Please delete or update those matches first.`)
                            } else {
                              alert(errorMsg)
                            }
                          }
                        }}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
                        title="Delete Player"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <h3 className="font-semibold text-navy-blue mb-2 pr-8">{participant.name}</h3>
                      {participant.players && participant.players.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {participant.players.map((player, idx) => (
                            <p key={idx}>• {player}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixtures Tab */}
        {activeTab === 'fixtures' && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-navy-blue">Fixtures & Matches</h2>
                <div className="flex gap-4">
                  <Link
                    to={`/admin/tournaments/${id}/fixtures`}
                    className="btn-primary"
                  >
                    {totalMatches === 0 ? 'Create Fixtures' : 'Manage Fixtures'}
                  </Link>
                  <Link
                    to={`/admin/tournaments/${id}/matches`}
                    className="btn-secondary"
                  >
                    View All Matches
                  </Link>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {totalMatches === 0 
                  ? 'Create rounds and generate matches automatically, or create matches manually.'
                  : 'Manage rounds, view standings, and control all tournament matches.'}
              </p>
            </div>

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

            {totalMatches === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600 text-lg mb-4">No fixtures created yet.</p>
                <p className="text-gray-500 mb-4">
                  {participants.length < 2 
                    ? 'Add at least 2 participants first, then create matches manually.'
                    : 'Create matches manually using the "Create Match" button.'}
                </p>
                <Link
                  to={`/admin/tournaments/${id}/matches`}
                  className="btn-primary inline-block"
                  disabled={participants.length < 2}
                >
                  Go to Matches Page
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomTournamentManage

