import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const ParticipantsManagement = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState([])
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => {
    fetchTournament()
    fetchParticipants()
  }, [id])

  const fetchTournament = async () => {
    try {
      const response = await adminAPI.getTournament(id)
      setTournament(response.data.data)
    } catch (err) {
      setError('Failed to load tournament')
      console.error(err)
    }
  }

  const fetchParticipants = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getTournamentParticipants(id)
      setParticipants(response.data.data.participants || [])
    } catch (err) {
      console.error('Failed to load participants:', err)
      setParticipants([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase()
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        setError('Invalid file type. Please upload CSV or Excel files.')
        setValidationErrors([])
        return
      }
      setFile(selectedFile)
      setError('')
      setValidationErrors([])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError('')
    setValidationErrors([])
    setSuccess('')

    try {
      const response = await adminAPI.uploadParticipants(id, file)
      setSuccess(response.data.message || 'Participants uploaded successfully!')
      setFile(null)
      // Reset file input
      e.target.reset()
      // Refresh participants list
      fetchParticipants()
    } catch (err) {
      const errorData = err.response?.data
      setError(errorData?.message || 'Failed to upload participants')
      
      // Extract detailed validation errors if available
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        setValidationErrors(errorData.errors)
      } else if (errorData?.duplicates && Array.isArray(errorData.duplicates)) {
        setValidationErrors([
          `Duplicate participant names found: ${errorData.duplicates.join(', ')}`
        ])
      } else {
        setValidationErrors([])
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/admin/tournaments/${id}`}
          className="text-forest-green hover:text-navy-blue mb-4 inline-block"
        >
          ← Back to Tournament
        </Link>
        <h1 className="text-3xl font-bold text-navy-blue mt-4">
          Manage Participants
        </h1>
        {tournament && (
          <p className="text-gray-600 mt-2">
            {tournament.name} • {tournament.type} • {tournament.format}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="font-semibold mb-2">{error}</div>
          {validationErrors.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">Validation Errors ({validationErrors.length}):</div>
              <ul className="list-disc list-inside text-sm space-y-1 max-h-60 overflow-y-auto bg-white p-2 rounded">
                {validationErrors.map((err, index) => (
                  <li key={index} className="break-words">{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="card">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">
            Upload Participants
          </h2>
          <p className="text-gray-600 mb-4">
            Upload a CSV or Excel file with participant names. For doubles tournaments,
            include both player names in each row.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-blue mb-2">
                Select File (CSV or Excel)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-green file:text-navy-blue hover:file:bg-forest-green hover:file:text-white"
                disabled={uploading}
              />
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Participants'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-cream rounded-lg">
            <h3 className="font-semibold text-navy-blue mb-2">File Format:</h3>
            {tournament?.type === 'singles' ? (
              <div className="text-sm text-gray-700">
                <p className="mb-2"><strong>CSV/Excel Format (Singles):</strong></p>
                <p className="mb-1">Header row: <code className="bg-white px-1 rounded">name, player1</code></p>
                <p className="mb-1">Example:</p>
                <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`name,player1
Team A,John Doe
Team B,Jane Smith`}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                <p className="mb-2"><strong>CSV/Excel Format (Doubles):</strong></p>
                <p className="mb-1">Header row: <code className="bg-white px-1 rounded">name, player1, player2</code></p>
                <p className="mb-1">Example:</p>
                <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`name,player1,player2
Team A,John Doe,Jane Doe
Team B,Bob Smith,Alice Smith`}
                </pre>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-2">
              <strong>Note:</strong> Column names are case-insensitive. You can use variations like "Name", "NAME", "Participant Name", etc.
            </p>
          </div>
        </div>

        {/* Participants List */}
        <div className="card">
          <h2 className="text-2xl font-bold text-navy-blue mb-4">
            Current Participants
          </h2>

          {loading ? (
            <div className="text-center py-8">Loading participants...</div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No participants uploaded yet.</p>
              <p className="text-sm mt-2">Upload a file to add participants.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div
                  key={participant._id || index}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-cream"
                >
                  <div className="font-medium text-navy-blue">
                    {participant.name}
                  </div>
                  {participant.players && participant.players.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Players: {participant.players.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParticipantsManagement

