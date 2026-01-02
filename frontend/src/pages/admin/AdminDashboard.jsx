import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { adminAPI } from '../../services/api'

const AdminDashboard = () => {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getTournaments()
      setTournaments(response.data.data || [])
      setError(null)
    } catch (err) {
      setError('Failed to load tournaments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      live: 'bg-pink text-white',
      completed: 'bg-forest-green text-white',
      draft: 'bg-gray-400 text-white',
    }
    return badges[status] || 'bg-gray-400 text-white'
  }

  const handleTogglePublic = async (tournamentId) => {
    try {
      await adminAPI.toggleTournamentPublic(tournamentId)
      fetchTournaments()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tournament visibility')
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-2">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome, {admin?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link to="/admin/tournaments/custom" className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2">
              ➕ Create Tournament
            </Link>
            <Link to="/admin/tournaments/custom/list" className="btn-secondary text-sm sm:text-base px-3 sm:px-4 py-2">
              ⚙️ Tournaments
            </Link>
            <button onClick={handleLogout} className="btn-secondary text-sm sm:text-base px-3 sm:px-4 py-2">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="card bg-lime-green bg-opacity-20 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-navy-blue mb-2">Total Tournaments</h3>
          <p className="text-2xl sm:text-3xl font-bold text-navy-blue">{tournaments.length}</p>
        </div>
        <div className="card bg-pink bg-opacity-20 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-navy-blue mb-2">Live Tournaments</h3>
          <p className="text-2xl sm:text-3xl font-bold text-navy-blue">
            {tournaments.filter(t => t.status === 'live').length}
          </p>
        </div>
        <div className="card bg-forest-green bg-opacity-20 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-navy-blue mb-2">Completed</h3>
          <p className="text-2xl sm:text-3xl font-bold text-navy-blue">
            {tournaments.filter(t => t.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4">My Tournaments</h2>
        
        {loading ? (
          <div className="text-center py-8 text-sm sm:text-base">Loading tournaments...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 text-sm sm:text-base">{error}</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-4 text-sm sm:text-base">No tournaments yet.</p>
            <Link to="/admin/tournaments/custom" className="btn-primary inline-block text-sm sm:text-base">
              Create Your First Tournament
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {tournaments.map((tournament) => (
                <div key={tournament._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base font-semibold text-navy-blue flex-1">{tournament.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getStatusBadge(tournament.status)}`}>
                      {tournament.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-3">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{tournament.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="capitalize">{tournament.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Round:</span>
                      <span>{tournament.currentRound || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Published:</span>
                      <button
                        onClick={() => handleTogglePublic(tournament._id)}
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          tournament.isPublic
                            ? 'bg-lime-green text-navy-blue'
                            : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {tournament.isPublic ? 'Published' : 'Draft'}
                      </button>
                    </div>
                  </div>
                  {tournament.format === 'custom' && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                      <Link
                        to={`/admin/tournaments/custom/${tournament._id}/edit`}
                        className="text-xs text-lime-green hover:text-forest-green"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/admin/tournaments/custom/${tournament._id}/manage`}
                        className="text-xs text-forest-green hover:text-navy-blue"
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/admin/tournaments/custom/${tournament._id}/matches`}
                        className="text-xs text-forest-green hover:text-navy-blue"
                      >
                        Matches
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
              <thead className="bg-navy-blue">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Tournament
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Round
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tournaments.map((tournament) => (
                  <tr key={tournament._id} className="hover:bg-cream">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-navy-blue">{tournament.name}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">{tournament.type}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">{tournament.format}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(tournament.status)}`}>
                        {tournament.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{tournament.currentRound || '-'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublic(tournament._id, tournament.isPublic)}
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          tournament.isPublic
                            ? 'bg-lime-green text-navy-blue'
                            : 'bg-gray-300 text-gray-700'
                        } hover:opacity-80`}
                      >
                        {tournament.isPublic ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {tournament.format === 'custom' ? (
                        <>
                          <Link
                            to={`/admin/tournaments/custom/${tournament._id}/edit`}
                            className="text-lime-green hover:text-forest-green mr-4"
                          >
                            Edit
                          </Link>
                          <Link
                            to={`/admin/tournaments/custom/${tournament._id}/manage`}
                            className="text-forest-green hover:text-navy-blue mr-4"
                          >
                            Manage
                          </Link>
                          <Link
                            to={`/admin/tournaments/custom/${tournament._id}/matches`}
                            className="text-forest-green hover:text-navy-blue"
                          >
                            Matches
                          </Link>
                        </>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
