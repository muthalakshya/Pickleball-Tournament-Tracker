import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { scrollToTop } from '../../utils/scrollToTop'

const CustomTournamentCreator = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    type: 'singles',
    format: 'custom',
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
        format: 'custom',
        rules: {
          points: parseInt(formData.rules.points) || 11,
          scoringSystem: formData.rules.scoringSystem
        }
      }

      if (isEdit) {
        await adminAPI.updateTournament(id, tournamentData)
        scrollToTop()
        navigate(`/admin/tournaments/custom/${id}/manage`, {
          state: { 
            message: 'Custom tournament updated successfully!'
          }
        })
      } else {
        tournamentData.isPublic = false
        const response = await adminAPI.createTournament(tournamentData)
        scrollToTop()
        navigate(`/admin/tournaments/custom/${response.data.data._id}/manage`, {
          state: { 
            // message: 'Custom tournament created successfully!'
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
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue">
                {isEdit ? 'Edit Tournament' : 'Create Tournament'}
              </h1>
              <Link
                to="/admin/tournaments/custom/list"
                onClick={scrollToTop}
                className="inline-flex items-center text-navy-blue hover:text-forest-green font-semibold text-sm sm:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                View Tournaments
              </Link>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              {isEdit ? 'Edit your tournament details' : 'Create a tournament with manual fixture management'}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {fetching && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-navy-blue text-sm sm:text-base">Loading tournament...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm sm:text-base">
            {error}
          </div>
        )}

        {!fetching && (
          <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-white/20">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4 sm:mb-6">Tournament Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Tournament Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                  required
                >
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                </select>
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Tournament Format
                </label>
                <input
                  type="text"
                  value="Custom"
                  disabled
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed text-sm sm:text-base"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Custom tournaments allow manual fixture management
                </p>
              </div> */}

              <div>
                <label className="block text-sm font-medium text-navy-blue mb-2">
                  Points to Win <span className="text-red-500">*</span>
                </label>
                <select
                  name="rules.points"
                  value={formData.rules.points}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                  required
                >
                  <option value="rally">Rally Scoring</option>
                  <option value="pickleball">Traditional Pickleball</option>
                </select>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-yellow-800">
                  <strong>Note:</strong> This tournament will be saved as a <strong>draft</strong> and will not be published until you manually publish it from the dashboard.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
                <Link
                  to="/admin/tournaments/custom/list"
                  onClick={scrollToTop}
                  className="btn-secondary text-center text-sm sm:text-base px-6 py-3"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || fetching}
                  className="btn-primary text-sm sm:text-base px-6 py-3"
                >
                  {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Tournament' : 'Create Tournament')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CustomTournamentCreator
