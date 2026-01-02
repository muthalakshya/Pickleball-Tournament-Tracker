import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const CustomTournamentCreator = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    type: 'singles',
    format: 'custom', // Fixed to 'custom'
    rules: {
      points: 11,
      scoringSystem: 'rally'
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (isEdit) {
      fetchTournament()
    }
  }, [id])

  const fetchTournament = async () => {
    try {
      setFetching(true)
      const response = await adminAPI.getTournament(id)
      const tournament = response.data.data

      // Only allow editing custom tournaments
      if (tournament.format !== 'custom') {
        setError('This is not a custom tournament. Please use the general editor.')
        return
      }

      setFormData({
        name: tournament.name || '',
        location: tournament.location || '',
        date: tournament.date ? new Date(tournament.date).toISOString().split('T')[0] : '',
        type: tournament.type || 'singles',
        format: 'custom',
        rules: {
          points: tournament.rules?.points || 11,
          scoringSystem: tournament.rules?.scoringSystem || 'rally'
        }
      })
      setError('')
    } catch (err) {
      setError('Failed to load tournament')
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type } = e.target
    
    if (name.includes('.')) {
      // Handle nested fields (rules)
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'number' ? parseInt(value) : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation: All fields required
    if (!formData.name || !formData.location || !formData.date || !formData.type || !formData.rules.points) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const tournamentData = {
        name: formData.name,
        location: formData.location,
        date: new Date(formData.date).toISOString(),
        type: formData.type,
        format: 'custom', // Always 'custom'
        rules: {
          points: parseInt(formData.rules.points) || 11, // Ensure it's a number
          scoringSystem: formData.rules.scoringSystem
        }
      }

      if (isEdit) {
        // Update existing tournament
        await adminAPI.updateTournament(id, tournamentData)
        navigate('/admin/tournaments/custom/list', {
          state: { 
            message: 'Custom tournament updated successfully!'
          }
        })
      } else {
        // Create new tournament
        tournamentData.isPublic = false // Always save as draft (not published)
        const response = await adminAPI.createTournament(tournamentData)
        navigate('/admin/tournaments/custom/list', {
          state: { 
            message: 'Custom tournament created successfully!'
          }
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} tournament`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-navy-blue">
              {isEdit ? 'Edit Custom Tournament' : 'Create Custom Tournament'}
            </h1>
            <Link
              to="/admin/tournaments/custom/list"
              className="text-navy-blue hover:text-forest-green font-semibold"
            >
              ← View Custom Tournaments
            </Link>
          </div>
          <p className="text-gray-600">
            {isEdit ? 'Edit your custom tournament details' : 'Create a custom tournament with manual fixture management'}
          </p>
        </div>

        {/* Loading State */}
        {fetching && (
          <div className="text-center py-12 text-navy-blue">Loading tournament...</div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!fetching && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy-blue mb-6">Tournament Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Tournament Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                placeholder="e.g., Summer Pickleball Championship 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                placeholder="e.g., Central Park, New York"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Tournament Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Tournament Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                required
              >
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Tournament Format
              </label>
              <input
                type="text"
                value="Custom"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom tournaments allow manual fixture management
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Points to Win <span className="text-red-500">*</span>
              </label>
              <select
                name="rules.points"
                value={formData.rules.points}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                required
              >
                <option value={11}>11 Points</option>
                <option value={15}>15 Points</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Scoring System <span className="text-red-500">*</span>
              </label>
              <select
                name="rules.scoringSystem"
                value={formData.rules.scoringSystem}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                required
              >
                <option value="rally">Rally Scoring</option>
                <option value="pickleball">Traditional Pickleball</option>
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This tournament will be saved as a <strong>draft</strong> and will not be published until you manually publish it from the dashboard.
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link
                to="/admin/tournaments/custom/list"
                className="btn-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || fetching}
                className="btn-primary"
              >
                {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Tournament' : 'Create Custom Tournament')}
              </button>
            </div>
          </div>
        </form>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-lime-green bg-opacity-10 border border-lime-green rounded-lg p-6">
          <h3 className="text-lg font-semibold text-navy-blue mb-2">💡 Custom Tournament Features</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Manual fixture creation and management</li>
            <li>• Full control over match scheduling</li>
            <li>• Custom bracket structures</li>
            <li>• Flexible tournament formats</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CustomTournamentCreator
