import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const TournamentEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    type: 'singles',
    format: 'roundRobin',
    rules: {
      points: 11,
      scoringSystem: 'rally'
    },
    currentRound: '',
    isPublic: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('draft')

  useEffect(() => {
    if (isEdit) {
      fetchTournament()
    }
  }, [id])

  const fetchTournament = async () => {
    try {
      const response = await adminAPI.getTournament(id)
      const tournament = response.data.data
      setFormData({
        name: tournament.name,
        type: tournament.type,
        format: tournament.format,
        rules: tournament.rules,
        currentRound: tournament.currentRound || '',
        isPublic: tournament.isPublic
      })
      setStatus(tournament.status)
    } catch (err) {
      setError('Failed to load tournament')
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isEdit) {
        await adminAPI.updateTournament(id, formData)
      } else {
        await adminAPI.createTournament(formData)
      }
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save tournament')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublic = async () => {
    try {
      await adminAPI.toggleTournamentPublic(id)
      fetchTournament() // Refresh tournament data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tournament visibility')
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await adminAPI.updateTournamentStatus(id, { status: newStatus })
      setStatus(newStatus)
      alert(`Tournament status updated to ${newStatus}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status')
    }
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
        <h1 className="text-4xl font-bold text-navy-blue">
          {isEdit ? 'Edit Tournament' : 'Create Tournament'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Tournament Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Type *
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Format *
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                >
                  <option value="roundRobin">Round Robin</option>
                  <option value="group">Group</option>
                  <option value="knockout">Knockout</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Points *
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={formData.rules.points}
                  onChange={(e) => setFormData({
                    ...formData,
                    rules: { ...formData.rules, points: parseInt(e.target.value) }
                  })}
                >
                  <option value={11}>11</option>
                  <option value={15}>15</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Scoring System *
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  value={formData.rules.scoringSystem}
                  onChange={(e) => setFormData({
                    ...formData,
                    rules: { ...formData.rules, scoringSystem: e.target.value }
                  })}
                >
                  <option value="rally">Rally</option>
                  <option value="pickleball">Pickleball</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Current Round
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                value={formData.currentRound}
                onChange={(e) => setFormData({ ...formData, currentRound: e.target.value })}
                placeholder="e.g., Quarter Finals"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                className="h-4 w-4 text-lime-green focus:ring-lime-green border-gray-300 rounded"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-navy-blue">
                Make tournament public
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Tournament' : 'Create Tournament'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-navy-blue hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {isEdit && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-navy-blue mb-4">Tournament Status</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Current: <span className="font-semibold capitalize">{status}</span></p>
                {status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('live')}
                    className="w-full btn-secondary"
                  >
                    Start Tournament
                  </button>
                )}
                {status === 'live' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="w-full btn-secondary"
                  >
                    Complete Tournament
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-navy-blue mb-4">Visibility</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Public Visibility:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    formData.isPublic
                      ? 'bg-lime-green text-navy-blue'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {formData.isPublic ? 'Published' : 'Draft (Not Public)'}
                  </span>
                </div>
                <button
                  onClick={handleTogglePublic}
                  className={`w-full px-4 py-2 rounded-lg font-semibold ${
                    formData.isPublic
                      ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      : 'bg-lime-green text-navy-blue hover:bg-forest-green hover:text-white'
                  }`}
                >
                  {formData.isPublic ? 'Unpublish Tournament' : 'Publish Tournament'}
                </button>
                <p className="text-xs text-gray-600 mt-2">
                  {formData.isPublic
                    ? 'Tournament is visible to public users'
                    : 'Tournament is only visible to you. Publish to make it public.'}
                </p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-navy-blue mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to={`/admin/tournaments/${id}/participants`}
                  className="block w-full btn-primary text-center"
                >
                  Manage Participants
                </Link>
                <Link
                  to={`/admin/tournaments/${id}/fixtures`}
                  className="block w-full btn-secondary text-center"
                >
                  Generate Fixtures
                </Link>
                <Link
                  to={`/admin/tournaments/${id}/matches`}
                  className="block w-full text-center px-4 py-2 border border-forest-green text-forest-green rounded-lg hover:bg-forest-green hover:text-white"
                >
                  Manage Matches
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TournamentEditor

