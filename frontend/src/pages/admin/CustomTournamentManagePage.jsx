import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const CustomTournamentManagePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState({ past: [], live: [], upcoming: [], cancelled: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // overview, players, fixtures, matches

  // Form states for adding players
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false)
  const [playerForm, setPlayerForm] = useState({
    name: '',
    player1: '',
    player2: ''
  })
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState([])
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [showNoPlayersModal, setShowNoPlayersModal] = useState(false)

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
      setError(err.response?.data?.message || 'Failed to load tournament data')
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
    setError('')
    setUploadErrors([])

    if (!playerForm.name || !playerForm.player1 || (tournament.type === 'doubles' && !playerForm.player2)) {
      setError('Please fill in all required player fields.')
      return
    }

    const playersArray = [playerForm.player1.trim()]
    if (tournament.type === 'doubles' && playerForm.player2) {
      playersArray.push(playerForm.player2.trim())
    }

    try {
      await adminAPI.createParticipant(id, {
        name: playerForm.name.trim(),
        players: playersArray
      })
      setPlayerForm({ name: '', player1: '', player2: '' })
      setShowAddPlayerForm(false)
      fetchTournamentData()
      alert('Player added successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add player')
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase()
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        setError('Invalid file type. Please upload CSV or Excel files.')
        setUploadErrors([])
        return
      }
      setUploadFile(selectedFile)
      setError('')
      setUploadErrors([])
    }
  }

  const handleUploadParticipants = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError('')
    setUploadErrors([])
    setUploadSuccess('')

    try {
      const response = await adminAPI.uploadParticipants(id, uploadFile)
      setUploadSuccess(response.data.message || 'Participants uploaded successfully!')
      setUploadFile(null)
      e.target.reset()
      fetchTournamentData()
    } catch (err) {
      const errorData = err.response?.data
      setError(errorData?.message || 'Failed to upload participants')
      
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        setUploadErrors(errorData.errors)
      } else if (errorData?.duplicates && Array.isArray(errorData.duplicates)) {
        setUploadErrors([
          `Duplicate participant names found: ${errorData.duplicates.join(', ')}`
        ])
      } else {
        setUploadErrors([])
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePlayer = async (participantId, participantName) => {
    if (!window.confirm(`Are you sure you want to delete participant "${participantName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await adminAPI.deleteParticipant(id, participantId)
      fetchTournamentData()
      alert('Participant deleted successfully!')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete participant'
      if (err.response?.data?.matchesCount) {
        alert(`${errorMsg}\n\nThis player is involved in ${err.response.data.matchesCount} match(es). Please delete or update those matches first.`)
      } else {
        alert(errorMsg)
      }
    }
  }

  const handleDeleteTournament = async () => {
    if (!window.confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone and will delete all associated data (participants, matches).`)) {
      return
    }

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
              ← Back to Custom Tournaments
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => {
              if (participants.length < 1) {
                setShowNoPlayersModal(true)
              } else {
                navigate(`/admin/tournaments/custom/${id}/setup`)
              }
            }}
            className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow text-center w-full"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold text-navy-blue">Setup Tournament</div>
            <div className="text-xs text-gray-600 mt-1">Group or simple format</div>
          </button>
          {/* <Link
            to={`/admin/tournaments/${id}/fixtures`}
            className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow text-center"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-semibold text-navy-blue">Manage Fixtures</div>
            <div className="text-xs text-gray-600 mt-1">Create rounds & matches</div>
          </Link> */}
          <Link
            to={`/admin/tournaments/custom/${id}/matches`}
            className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow text-center"
          >
            <div className="text-2xl mb-2">🎾</div>
            <div className="font-semibold text-navy-blue">All Matches</div>
            <div className="text-xs text-gray-600 mt-1">{totalMatches} total matches</div>
          </Link>
          <Link
            to={`/admin/tournaments/custom/${id}/edit`}
            className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow text-center"
          >
            <div className="text-2xl mb-2">✏️</div>
            <div className="font-semibold text-navy-blue">Edit Tournament</div>
            <div className="text-xs text-gray-600 mt-1">Update details</div>
          </Link>
          <button onClick={() => setActiveTab('players')} className="bg-white rounded-lg shadow-lg p-4 text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-semibold text-navy-blue">Participants</div>
            <div className="text-xs text-gray-600 mt-1">{participants.length} players</div>
          </button>
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
                <div>
                  <p className="text-sm text-gray-600">Scoring System</p>
                  <p className="font-semibold text-navy-blue capitalize">{tournament.rules?.scoringSystem || 'rally'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Format</p>
                  <p className="font-semibold text-navy-blue">Custom</p>
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

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-red-700 mb-4">Danger Zone</h2>
              <p className="text-red-600 mb-4">
                Deleting a tournament is irreversible and will remove all associated data (participants, matches).
              </p>
              <button
                onClick={handleDeleteTournament}
                className={`btn-danger ${tournament.status === 'live' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={tournament.status === 'live'}
              >
                Delete Tournament
              </button>
              {tournament.status === 'live' && (
                <p className="text-sm text-red-500 mt-2">
                  Cannot delete a live tournament. Please complete or cancel it first.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Add Player Form */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Add New Player</h2>
              <button
                onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
                className="btn-secondary mb-4"
              >
                {showAddPlayerForm ? 'Hide Form' : 'Add Player Manually'}
              </button>

              {showAddPlayerForm && (
                <form onSubmit={handleAddPlayer} className="space-y-4 mt-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Bulk Upload */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Bulk Upload Players (CSV/Excel)</h2>
              {uploadSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  {uploadSuccess}
                </div>
              )}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              {uploadErrors.length > 0 && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <p className="font-bold">Upload Errors:</p>
                  <ul className="list-disc list-inside">
                    {uploadErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <form onSubmit={handleUploadParticipants}>
                <div className="mb-4">
                  <label htmlFor="file-upload" className="block text-sm font-medium text-navy-blue mb-2">
                    Upload File (CSV, XLSX, XLS)
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    For {tournament.type === 'singles' ? 'singles' : 'doubles'}: CSV format with columns: name, player1{tournament.type === 'doubles' ? ', player2' : ''}
                  </p>
                </div>
                <button type="submit" className="btn-primary" disabled={!uploadFile || uploading}>
                  {uploading ? 'Uploading...' : 'Upload Participants'}
                </button>
              </form>
            </div>

            {/* Players List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-navy-blue mb-4">Current Players ({participants.length})</h2>
              {participants.length === 0 ? (
                <p className="text-gray-600">No players added yet. Add players using the form above.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant) => (
                    <div key={participant._id} className="border border-gray-200 rounded-lg p-4 relative hover:shadow-md transition-shadow bg-white">
                      <button
                        onClick={() => handleDeletePlayer(participant._id, participant.name)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1.5 transition-all z-10"
                        title="Delete Player"
                        aria-label={`Delete ${participant.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <h3 className="font-semibold text-navy-blue mb-2 pr-12 break-words">{participant.name}</h3>
                      {participant.players && participant.players.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {participant.players.map((player, idx) => (
                            <p key={idx} className="truncate">• {player}</p>
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
                    Manage Fixtures
                  </Link>
                  <Link
                    to={`/admin/tournaments/custom/${id}/matches`}
                    className="btn-secondary"
                  >
                    View All Matches
                  </Link>
                </div>
              </div>
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
                <p className="text-gray-500 mb-4">Create rounds and matches using the fixture manager.</p>
                <Link
                  to={`/admin/tournaments/custom/${id}/fixtures`}
                  className="btn-primary inline-block"
                >
                  Go to Fixture Manager
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* No Players Modal */}
      {showNoPlayersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-navy-blue mb-4">No Players Added</h2>
              <p className="text-gray-600 mb-6">
                You need to add at least <strong>1 player</strong> before setting up the tournament fixtures.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowNoPlayersModal(false)
                    setActiveTab('players')
                  }}
                  className="btn-primary"
                >
                  Add Players
                </button>
                <button
                  onClick={() => setShowNoPlayersModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomTournamentManagePage

