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
      // Use admin API to get all tournaments (including drafts and unpublished)
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
      fetchTournaments() // Refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tournament visibility')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy-blue mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome, {admin?.email}</p>
        </div>
        <div className="flex gap-4">
          <Link to="/admin/tournaments/new" className="btn-secondary">
            Quick Create
          </Link>
          <Link to="/admin/tournaments/custom/list" className="btn-primary">
            ⚙️ Custom Tournaments
          </Link>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-lime-green bg-opacity-20">
          <h3 className="text-lg font-semibold text-navy-blue mb-2">Total Tournaments</h3>
          <p className="text-3xl font-bold text-navy-blue">{tournaments.length}</p>
        </div>
        <div className="card bg-pink bg-opacity-20">
          <h3 className="text-lg font-semibold text-navy-blue mb-2">Live Tournaments</h3>
          <p className="text-3xl font-bold text-navy-blue">
            {tournaments.filter(t => t.status === 'live').length}
          </p>
        </div>
        <div className="card bg-forest-green bg-opacity-20">
          <h3 className="text-lg font-semibold text-navy-blue mb-2">Completed</h3>
          <p className="text-3xl font-bold text-navy-blue">
            {tournaments.filter(t => t.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="card">
        <h2 className="text-2xl font-bold text-navy-blue mb-4">My Tournaments</h2>
        
        {loading ? (
          <div className="text-center py-8">Loading tournaments...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-4">No tournaments yet.</p>
            <Link to="/admin/tournaments/new" className="btn-primary inline-block">
              Create Your First Tournament
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-navy-blue">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Tournament
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Round
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tournaments.map((tournament) => (
                  <tr key={tournament._id} className="hover:bg-cream">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-navy-blue">{tournament.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">{tournament.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">{tournament.format}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(tournament.status)}`}>
                        {tournament.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{tournament.currentRound || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/admin/tournaments/${tournament._id}`}
                        className="text-lime-green hover:text-forest-green mr-4"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/admin/tournaments/${tournament._id}/matches`}
                        className="text-forest-green hover:text-navy-blue"
                      >
                        Matches
                      </Link>
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

