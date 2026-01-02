import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const CustomTournamentsViewAll = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('date') // 'date', 'name', 'status'
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'draft', 'live', 'completed', etc.

  useEffect(() => {
    fetchCustomTournaments()
    
    // Show success message if redirected from creation/update
    const message = location.state?.message
    if (message) {
      const stateMessage = location.state.message
      window.history.replaceState({}, document.title)
      alert(stateMessage)
    }
  }, [])

  const fetchCustomTournaments = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getCustomTournaments()
      setTournaments(response.data.data || [])
      setError(null)
    } catch (err) {
      setError('Failed to load custom tournaments')
      console.error(err)
    } finally {
      setLoading(false)
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const handleDeleteTournament = async (tournamentId, tournamentName, tournamentStatus) => {
    if (!window.confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
      return
    }
    
    if (tournamentStatus === 'live') {
      alert('Cannot delete a live tournament. Please complete or cancel it first.')
      return
    }

    try {
      await adminAPI.deleteTournament(tournamentId)
      fetchCustomTournaments()
      alert('Tournament deleted successfully!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete tournament')
    }
  }

  const handleTogglePublic = async (tournamentId) => {
    try {
      await adminAPI.toggleTournamentPublic(tournamentId)
      fetchCustomTournaments()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update visibility')
    }
  }

  // Filter tournaments
  const filteredTournaments = filterStatus === 'all' 
    ? tournaments 
    : tournaments.filter(t => t.status === filterStatus)

  // Sort tournaments
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'status':
        const statusOrder = { draft: 0, comingSoon: 1, live: 2, delayed: 3, completed: 4, cancelled: 5 }
        return statusOrder[a.status] - statusOrder[b.status]
      case 'date':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt)
    }
  })

  const stats = {
    total: tournaments.length,
    draft: tournaments.filter(t => t.status === 'draft').length,
    live: tournaments.filter(t => t.status === 'live').length,
    completed: tournaments.filter(t => t.status === 'completed').length,
    published: tournaments.filter(t => t.isPublic).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading custom tournaments...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-navy-blue mb-2">Custom Tournaments</h1>
              <p className="text-gray-600">Manage your custom tournaments with manual fixture control</p>
            </div>
            <div className="flex gap-4">
              {/* <Link to="/admin/dashboard" className="text-navy-blue hover:text-forest-green font-semibold">
                ← Dashboard
              </Link> */}
              <Link to="/admin/tournaments/custom" className="btn-primary">
                + Create Custom Tournament
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-navy-blue">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Draft</p>
            <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Live</p>
            <p className="text-2xl font-bold text-pink">{stats.live}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-forest-green">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Published</p>
            <p className="text-2xl font-bold text-lime-green">{stats.published}</p>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-navy-blue">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="comingSoon">Coming Soon</option>
                <option value="live">Live</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-navy-blue">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
              >
                <option value="date">Date Created (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div className="ml-auto text-sm text-gray-600">
              Showing {sortedTournaments.length} of {tournaments.length} tournament{sortedTournaments.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Tournaments List */}
        {sortedTournaments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No custom tournaments found.</p>
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="text-lime-green hover:text-forest-green font-semibold mb-4"
              >
                Clear Filter
              </button>
            )}
            <Link to="/admin/tournaments/custom" className="btn-primary inline-block">
              Create Your First Custom Tournament
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTournaments.map((tournament) => (
              <div key={tournament._id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-navy-blue flex-1 pr-2">
                    {tournament.name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadge(tournament.status)}`}>
                    {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {tournament.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-semibold mr-2">📍</span>
                      <span className="truncate">{tournament.location}</span>
                    </div>
                  )}
                  {tournament.date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-semibold mr-2">📅</span>
                      {formatDate(tournament.date)}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-semibold mr-2">🎾</span>
                    {tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-semibold mr-2">⚙️</span>
                    Format: Custom
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-semibold mr-2">🎯</span>
                    {tournament.rules?.points || 11} Points
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      tournament.isPublic 
                        ? 'bg-lime-green bg-opacity-20 text-forest-green' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tournament.isPublic ? 'Published' : 'Draft'}
                    </span>
                    <button
                      onClick={() => handleTogglePublic(tournament._id)}
                      className={`text-xs px-2 py-1 rounded font-semibold ${
                        tournament.isPublic
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-lime-green bg-opacity-20 text-forest-green hover:bg-lime-green hover:bg-opacity-30'
                      }`}
                    >
                      {tournament.isPublic ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/tournaments/custom/${tournament._id}/manage`}
                      className="text-sm text-lime-green hover:text-forest-green font-semibold px-2 py-1 rounded hover:bg-lime-green hover:bg-opacity-10"
                      title="Manage Tournament"
                    >
                      Manage
                    </Link>
                    <Link
                      to={`/admin/tournaments/custom/${tournament._id}/edit`}
                      className="text-sm text-navy-blue hover:text-forest-green font-semibold"
                      title="Edit Tournament"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteTournament(tournament._id, tournament.name, tournament.status)}
                      className="text-sm text-red-600 hover:text-red-800 font-semibold"
                      title="Delete Tournament"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomTournamentsViewAll

