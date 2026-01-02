import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const GroupTournamentWizard = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1)
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Wizard form data
  const [formData, setFormData] = useState({
    useGroups: null, // null = not decided, true = groups, false = no groups
    numGroups: 4,
    minPlayersPerGroup: 3,
    maxPlayersPerGroup: 5,
    tournamentStructure: '', // 'quarterfinal', 'semifinal', 'directFinal'
    topPlayersPerGroup: 2,
    stage1Format: '', // 'roundRobin', 'knockout'
  })

  const [groupDistribution, setGroupDistribution] = useState([])
  const [calculatedGroups, setCalculatedGroups] = useState([])

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tournamentRes, participantsRes] = await Promise.all([
        adminAPI.getTournament(id),
        adminAPI.getTournamentParticipants(id)
      ])
      
      setTournament(tournamentRes.data.data)
      setParticipants(participantsRes.data.data.participants || [])
      setError('')
    } catch (err) {
      setError('Failed to load tournament data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate group distribution
  const calculateGroupDistribution = (numGroups, totalPlayers) => {
    const baseSize = Math.floor(totalPlayers / numGroups)
    const remainder = totalPlayers % numGroups
    
    const distribution = []
    for (let i = 0; i < numGroups; i++) {
      distribution.push(baseSize + (i < remainder ? 1 : 0))
    }
    
    return distribution
  }

  // Update distribution when groups or players change
  useEffect(() => {
    if (formData.useGroups === true && formData.numGroups > 0 && participants.length > 0) {
      const dist = calculateGroupDistribution(formData.numGroups, participants.length)
      setGroupDistribution(dist)
    }
  }, [formData.numGroups, formData.useGroups, participants.length])

  const handleNext = () => {
    // Validation based on step
    if (step === 1 && formData.useGroups === null) {
      alert('Please select whether to use groups or not')
      return
    }
    
    if (step === 2 && formData.useGroups === true) {
      if (formData.numGroups < 2) {
        alert('Please enter at least 2 groups')
        return
      }
      if (participants.length < formData.numGroups) {
        alert(`You need at least ${formData.numGroups} participants for ${formData.numGroups} groups`)
        return
      }
    }
    
    if (step === 3 && formData.useGroups === true) {
      if (!formData.tournamentStructure) {
        alert('Please select tournament structure')
        return
      }
      if (formData.topPlayersPerGroup < 1) {
        alert('Please enter at least 1 top player per group')
        return
      }
      const totalQualified = formData.topPlayersPerGroup * formData.numGroups
      if (formData.tournamentStructure === 'semifinal' && totalQualified !== 4) {
        alert('For semifinal, total qualified players must be exactly 4')
        return
      }
      if (formData.tournamentStructure === 'directFinal' && totalQualified !== 2) {
        alert('For direct final, total qualified players must be exactly 2')
        return
      }
    }
    
    if (step === 4 && formData.useGroups === true) {
      if (!formData.stage1Format) {
        alert('Please select Stage 1 format')
        return
      }
    }
    
    setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      // Call backend to generate group tournament fixtures
      const response = await adminAPI.generateGroupTournament(id, formData)
      alert('Group tournament fixtures generated successfully!')
      navigate(`/admin/tournaments/custom/${id}/manage`)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate fixtures')
      setError(err.response?.data?.message || 'Failed to generate fixtures')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Tournament not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-navy-blue mb-2">Tournament Fixture Setup</h1>
          <p className="text-gray-600">{tournament.name}</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= s ? 'bg-lime-green border-lime-green text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 5 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-lime-green' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Group or Not */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 1: Tournament Format</h2>
              <p className="text-gray-600 mb-6">Do you want to organize this tournament with groups?</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData({ ...formData, useGroups: true })}
                  className={`p-6 border-2 rounded-lg text-center transition-all ${
                    formData.useGroups === true
                      ? 'border-lime-green bg-lime-green bg-opacity-10'
                      : 'border-gray-300 hover:border-lime-green'
                  }`}
                >
                  <div className="text-4xl mb-2">👥</div>
                  <div className="font-semibold text-navy-blue">Yes, Use Groups</div>
                  <div className="text-sm text-gray-600 mt-2">Organize players into groups</div>
                </button>
                
                <button
                  onClick={() => {
                    setFormData({ ...formData, useGroups: false })
                    // If no groups, skip to simple round system
                    navigate(`/admin/tournaments/${id}/fixtures`)
                  }}
                  className={`p-6 border-2 rounded-lg text-center transition-all ${
                    formData.useGroups === false
                      ? 'border-lime-green bg-lime-green bg-opacity-10'
                      : 'border-gray-300 hover:border-lime-green'
                  }`}
                >
                  <div className="text-4xl mb-2">🎯</div>
                  <div className="font-semibold text-navy-blue">No Groups</div>
                  <div className="text-sm text-gray-600 mt-2">Simple round-based system</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Group Configuration */}
          {step === 2 && formData.useGroups === true && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 2: Group Configuration</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy-blue mb-2">
                    Number of Groups <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="8"
                    value={formData.numGroups}
                    onChange={(e) => setFormData({ ...formData, numGroups: parseInt(e.target.value) || 2 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Min Players per Group
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={formData.minPlayersPerGroup}
                      onChange={(e) => setFormData({ ...formData, minPlayersPerGroup: parseInt(e.target.value) || 2 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Max Players per Group
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={formData.maxPlayersPerGroup}
                      onChange={(e) => setFormData({ ...formData, maxPlayersPerGroup: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                    />
                  </div>
                </div>

                {/* Group Distribution Preview */}
                {groupDistribution.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-navy-blue mb-2">Group Distribution Preview</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Total Players: {participants.length} | Groups: {formData.numGroups}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupDistribution.map((size, index) => (
                        <div key={index} className="bg-white px-3 py-1 rounded border border-blue-300">
                          <span className="font-semibold text-navy-blue">Group {String.fromCharCode(65 + index)}:</span>
                          <span className="ml-2 text-gray-700">{size} players</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Distribution: {groupDistribution.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Tournament Structure */}
          {step === 3 && formData.useGroups === true && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 3: Tournament Structure</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy-blue mb-4">
                    Select Tournament Structure <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, tournamentStructure: 'quarterfinal' })}
                      className={`p-4 border-2 rounded-lg text-center ${
                        formData.tournamentStructure === 'quarterfinal'
                          ? 'border-lime-green bg-lime-green bg-opacity-10'
                          : 'border-gray-300 hover:border-lime-green'
                      }`}
                    >
                      <div className="font-semibold text-navy-blue">Quarterfinal</div>
                      <div className="text-xs text-gray-600 mt-1">8 teams</div>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, tournamentStructure: 'semifinal' })}
                      className={`p-4 border-2 rounded-lg text-center ${
                        formData.tournamentStructure === 'semifinal'
                          ? 'border-lime-green bg-lime-green bg-opacity-10'
                          : 'border-gray-300 hover:border-lime-green'
                      }`}
                    >
                      <div className="font-semibold text-navy-blue">Semifinal</div>
                      <div className="text-xs text-gray-600 mt-1">4 teams</div>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, tournamentStructure: 'directFinal' })}
                      className={`p-4 border-2 rounded-lg text-center ${
                        formData.tournamentStructure === 'directFinal'
                          ? 'border-lime-green bg-lime-green bg-opacity-10'
                          : 'border-gray-300 hover:border-lime-green'
                      }`}
                    >
                      <div className="font-semibold text-navy-blue">Direct Final</div>
                      <div className="text-xs text-gray-600 mt-1">2 teams</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-blue mb-2">
                    Top Players from Each Group <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.topPlayersPerGroup}
                    onChange={(e) => setFormData({ ...formData, topPlayersPerGroup: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total qualified: {formData.topPlayersPerGroup * formData.numGroups} players
                    {formData.tournamentStructure === 'semifinal' && formData.topPlayersPerGroup * formData.numGroups !== 4 && (
                      <span className="text-red-500"> (Must be exactly 4 for semifinal)</span>
                    )}
                    {formData.tournamentStructure === 'directFinal' && formData.topPlayersPerGroup * formData.numGroups !== 2 && (
                      <span className="text-red-500"> (Must be exactly 2 for direct final)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Stage 1 Format */}
          {step === 4 && formData.useGroups === true && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 4: Stage 1 (Group Stage) Format</h2>
              
              <div className="space-y-4">
                <label className="block text-sm font-medium text-navy-blue mb-4">
                  Select Stage 1 Format <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, stage1Format: 'roundRobin' })}
                    className={`p-6 border-2 rounded-lg text-center ${
                      formData.stage1Format === 'roundRobin'
                        ? 'border-lime-green bg-lime-green bg-opacity-10'
                        : 'border-gray-300 hover:border-lime-green'
                    }`}
                  >
                    <div className="text-3xl mb-2">🔄</div>
                    <div className="font-semibold text-navy-blue">Round Robin</div>
                    <div className="text-sm text-gray-600 mt-2">All teams in group play each other</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, stage1Format: 'knockout' })}
                    className={`p-6 border-2 rounded-lg text-center ${
                      formData.stage1Format === 'knockout'
                        ? 'border-lime-green bg-lime-green bg-opacity-10'
                        : 'border-gray-300 hover:border-lime-green'
                    }`}
                  >
                    <div className="text-3xl mb-2">⚔️</div>
                    <div className="font-semibold text-navy-blue">Knockout</div>
                    <div className="text-sm text-gray-600 mt-2">Knockout within each group</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review and Generate */}
          {step === 5 && formData.useGroups === true && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 5: Review & Generate</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tournament Format:</span>
                  <span className="font-semibold text-navy-blue">Group-based</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of Groups:</span>
                  <span className="font-semibold text-navy-blue">{formData.numGroups}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Group Distribution:</span>
                  <span className="font-semibold text-navy-blue">{groupDistribution.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tournament Structure:</span>
                  <span className="font-semibold text-navy-blue capitalize">
                    {formData.tournamentStructure === 'quarterfinal' ? 'Quarterfinal' :
                     formData.tournamentStructure === 'semifinal' ? 'Semifinal' :
                     formData.tournamentStructure === 'directFinal' ? 'Direct Final' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Top Players per Group:</span>
                  <span className="font-semibold text-navy-blue">{formData.topPlayersPerGroup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Qualified:</span>
                  <span className="font-semibold text-navy-blue">{formData.topPlayersPerGroup * formData.numGroups}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage 1 Format:</span>
                  <span className="font-semibold text-navy-blue capitalize">
                    {formData.stage1Format === 'roundRobin' ? 'Round Robin' :
                     formData.stage1Format === 'knockout' ? 'Knockout' : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will generate all fixtures for the group tournament. 
                  Standings will be calculated based on wins, then point difference.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            {step < 5 ? (
              <button
                onClick={handleNext}
                className="btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Generating...' : 'Generate Fixtures'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupTournamentWizard

