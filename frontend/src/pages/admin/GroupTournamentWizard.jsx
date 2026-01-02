import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const GroupTournamentWizard = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1) // Start at step 1 (which is now Group Configuration)
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const prevStepRef = useRef(1) // Track previous step to detect forward/backward navigation

  // Wizard form data - always use groups
  const [formData, setFormData] = useState({
    useGroups: true, // Always true - groups are mandatory
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
    if (formData.numGroups > 0 && participants.length > 0) {
      const dist = calculateGroupDistribution(formData.numGroups, participants.length)
      setGroupDistribution(dist)
    }
  }, [formData.numGroups, participants.length])

  // Check for odd-numbered groups when entering Step 3
  // If any group has odd number, automatically select Round Robin and skip to Step 4
  // Only auto-skip when navigating forward (from Step 2), not when going back (from Step 4)
  useEffect(() => {
    if (step === 3 && groupDistribution.length > 0) {
      const hasOddGroup = groupDistribution.some(size => size % 2 !== 0)
      const isForwardNavigation = prevStepRef.current === 2
      
      if (hasOddGroup && isForwardNavigation && !formData.stage1Format) {
        // Automatically set to Round Robin and skip to Step 4 only when coming from Step 2
        setFormData(prev => ({ ...prev, stage1Format: 'roundRobin' }))
        // Use setTimeout to ensure state update happens before navigation
        setTimeout(() => {
          setStep(4)
        }, 0)
      }
    }
    
    // Update previous step reference
    prevStepRef.current = step
  }, [step, groupDistribution, formData.stage1Format])

  const handleNext = () => {
    // Validation based on step
    // Step 1: Group Configuration (was Step 2)
    if (step === 1) {
      if (formData.numGroups < 2) {
        alert('Please enter at least 2 groups')
        return
      }
      if (participants.length < formData.numGroups) {
        alert(`You need at least ${formData.numGroups} participants for ${formData.numGroups} groups`)
        return
      }
      
      // Validate min/max players per group against actual distribution
      if (groupDistribution.length > 0) {
        const minSize = Math.min(...groupDistribution)
        const maxSize = Math.max(...groupDistribution)
        
        if (formData.minPlayersPerGroup > minSize || formData.maxPlayersPerGroup < maxSize) {
          alert(
            `Invalid min/max players per group!\n\n` +
            `Actual distribution: ${groupDistribution.join(', ')} players per group\n` +
            `Min: ${minSize}, Max: ${maxSize}\n\n` +
            `Your settings: Min ${formData.minPlayersPerGroup}, Max ${formData.maxPlayersPerGroup}\n\n` +
            `Please adjust min/max to be between ${minSize} and ${maxSize} (inclusive).`
          )
          return
        }
      }
      
      // Clear tournament structure when groups change
      setFormData({ ...formData, tournamentStructure: '' })
    }
    
    // Step 2: Tournament Structure (was Step 3)
    if (step === 2) {
      if (!formData.tournamentStructure) {
        alert('Please select a valid tournament structure')
        return
      }
      if (formData.topPlayersPerGroup < 1) {
        alert('Please enter at least 1 top player per group')
        return
      }
      const totalQualified = formData.topPlayersPerGroup * formData.numGroups
      if (formData.tournamentStructure === 'quarterfinal' && totalQualified !== 8) {
        alert('For quarterfinal, total qualified players must be exactly 8')
        return
      }
      if (formData.tournamentStructure === 'semifinal' && totalQualified !== 4) {
        alert('For semifinal, total qualified players must be exactly 4')
        return
      }
      if (formData.tournamentStructure === 'directFinal' && totalQualified !== 2) {
        alert('For direct final, total qualified players must be exactly 2')
        return
      }
    }
    
    // Step 3: Stage 1 Format (was Step 4)
    if (step === 3) {
      // Check if any group has odd number - if so, Round Robin is auto-selected
      const hasOddGroup = groupDistribution.some(size => size % 2 !== 0)
      
      if (hasOddGroup) {
        // Round Robin is automatically selected, so we can proceed
        if (!formData.stage1Format) {
          setFormData(prev => ({ ...prev, stage1Format: 'roundRobin' }))
        }
      } else {
        // All groups have even numbers, so user must select
        if (!formData.stage1Format) {
          alert('Please select Stage 1 format')
          return
        }
      }
    }
    
    prevStepRef.current = step // Update previous step before moving forward
    setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) {
      prevStepRef.current = step // Update previous step before moving back
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
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= s ? 'bg-lime-green border-lime-green text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 4 && (
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
          {/* Step 1: Group Configuration */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 1: Group Configuration</h2>
              
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
                    onChange={(e) => {
                      const newNumGroups = parseInt(e.target.value) || 2
                      const newTotalQualified = formData.topPlayersPerGroup * newNumGroups
                      // Clear tournament structure if it becomes invalid
                      let newStructure = formData.tournamentStructure
                      if (
                        (newStructure === 'quarterfinal' && newTotalQualified !== 8) ||
                        (newStructure === 'semifinal' && newTotalQualified !== 4) ||
                        (newStructure === 'directFinal' && newTotalQualified !== 2)
                      ) {
                        newStructure = ''
                      }
                      setFormData({ ...formData, numGroups: newNumGroups, tournamentStructure: newStructure })
                    }}
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
                {groupDistribution.length > 0 && (() => {
                  const minSize = Math.min(...groupDistribution)
                  const maxSize = Math.max(...groupDistribution)
                  const isValid = formData.minPlayersPerGroup <= minSize && formData.maxPlayersPerGroup >= maxSize
                  
                  return (
                    <div className={`border rounded-lg p-4 ${isValid ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-300'}`}>
                      <h3 className="font-semibold text-navy-blue mb-2">Group Distribution Preview</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Total Players: {participants.length} | Groups: {formData.numGroups}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {groupDistribution.map((size, index) => (
                          <div key={index} className="bg-white px-3 py-1 rounded border border-blue-300">
                            <span className="font-semibold text-navy-blue">Group {String.fromCharCode(65 + index)}:</span>
                            <span className="ml-2 text-gray-700">{size} players</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Distribution: {groupDistribution.join(', ')} | Min: {minSize}, Max: {maxSize}
                      </p>
                      {!isValid && (
                        <div className="bg-red-100 border border-red-300 rounded p-2 mt-2">
                          <p className="text-sm text-red-700 font-semibold">⚠️ Invalid Min/Max Settings!</p>
                          <p className="text-xs text-red-600 mt-1">
                            Your min ({formData.minPlayersPerGroup}) and max ({formData.maxPlayersPerGroup}) must be between {minSize} and {maxSize} (inclusive).
                            <br />
                            Please adjust: Min ≤ {minSize} and Max ≥ {maxSize}
                          </p>
                        </div>
                      )}
                      {isValid && (
                        <p className="text-xs text-green-600 font-semibold">✓ Min/Max settings are valid</p>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Step 2: Tournament Structure */}
          {step === 2 && (() => {
            const totalQualified = formData.topPlayersPerGroup * formData.numGroups
            const isQuarterfinalPossible = totalQualified === 8
            const isSemifinalPossible = totalQualified === 4
            const isDirectFinalPossible = totalQualified === 2
            
            // Clear tournament structure if it becomes invalid
            const currentStructureValid = 
              (formData.tournamentStructure === 'quarterfinal' && isQuarterfinalPossible) ||
              (formData.tournamentStructure === 'semifinal' && isSemifinalPossible) ||
              (formData.tournamentStructure === 'directFinal' && isDirectFinalPossible)
            
            return (
              <div>
                <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 2: Tournament Structure</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Top Players from Each Group <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.topPlayersPerGroup}
                      onChange={(e) => {
                        const newTopPlayers = parseInt(e.target.value) || 1
                        const newTotalQualified = newTopPlayers * formData.numGroups
                        // Clear tournament structure if it becomes invalid
                        let newStructure = formData.tournamentStructure
                        if (
                          (newStructure === 'quarterfinal' && newTotalQualified !== 8) ||
                          (newStructure === 'semifinal' && newTotalQualified !== 4) ||
                          (newStructure === 'directFinal' && newTotalQualified !== 2)
                        ) {
                          newStructure = ''
                        }
                        setFormData({ ...formData, topPlayersPerGroup: newTopPlayers, tournamentStructure: newStructure })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-lime-green focus:border-lime-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total qualified: <span className="font-semibold text-navy-blue">{totalQualified} players</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-4">
                      Select Tournament Structure <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Validation Message */}
                    {totalQualified !== 8 && totalQualified !== 4 && totalQualified !== 2 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>⚠️ No valid tournament structure available</strong>
                          <br />
                          With {totalQualified} qualified players, you need exactly 2, 4, or 8 players.
                          <br />
                          <span className="text-xs">Adjust "Top Players per Group" or "Number of Groups" to get a valid combination.</span>
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setFormData({ ...formData, tournamentStructure: 'quarterfinal' })}
                        disabled={!isQuarterfinalPossible}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          formData.tournamentStructure === 'quarterfinal'
                            ? 'border-lime-green bg-lime-green bg-opacity-10'
                            : isQuarterfinalPossible
                            ? 'border-gray-300 hover:border-lime-green cursor-pointer'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`font-semibold ${isQuarterfinalPossible ? 'text-navy-blue' : 'text-gray-400'}`}>
                          Quarterfinal
                        </div>
                        <div className={`text-xs mt-1 ${isQuarterfinalPossible ? 'text-gray-600' : 'text-gray-400'}`}>
                          8 teams required
                        </div>
                        {!isQuarterfinalPossible && (
                          <div className="text-xs text-red-500 mt-1">
                            {totalQualified < 8 ? `Need ${8 - totalQualified} more` : `${totalQualified - 8} too many`}
                          </div>
                        )}
                        {isQuarterfinalPossible && totalQualified === 8 && (
                          <div className="text-xs text-green-600 mt-1">✓ Perfect match</div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setFormData({ ...formData, tournamentStructure: 'semifinal' })}
                        disabled={!isSemifinalPossible}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          formData.tournamentStructure === 'semifinal'
                            ? 'border-lime-green bg-lime-green bg-opacity-10'
                            : isSemifinalPossible
                            ? 'border-gray-300 hover:border-lime-green cursor-pointer'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`font-semibold ${isSemifinalPossible ? 'text-navy-blue' : 'text-gray-400'}`}>
                          Semifinal
                        </div>
                        <div className={`text-xs mt-1 ${isSemifinalPossible ? 'text-gray-600' : 'text-gray-400'}`}>
                          4 teams required
                        </div>
                        {!isSemifinalPossible && (
                          <div className="text-xs text-red-500 mt-1">
                            {totalQualified < 4 ? `Need ${4 - totalQualified} more` : `${totalQualified - 4} too many`}
                          </div>
                        )}
                        {isSemifinalPossible && totalQualified === 4 && (
                          <div className="text-xs text-green-600 mt-1">✓ Perfect match</div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setFormData({ ...formData, tournamentStructure: 'directFinal' })}
                        disabled={!isDirectFinalPossible}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          formData.tournamentStructure === 'directFinal'
                            ? 'border-lime-green bg-lime-green bg-opacity-10'
                            : isDirectFinalPossible
                            ? 'border-gray-300 hover:border-lime-green cursor-pointer'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`font-semibold ${isDirectFinalPossible ? 'text-navy-blue' : 'text-gray-400'}`}>
                          Direct Final
                        </div>
                        <div className={`text-xs mt-1 ${isDirectFinalPossible ? 'text-gray-600' : 'text-gray-400'}`}>
                          2 teams required
                        </div>
                        {!isDirectFinalPossible && (
                          <div className="text-xs text-red-500 mt-1">
                            {totalQualified < 2 ? `Need ${2 - totalQualified} more` : `${totalQualified - 2} too many`}
                          </div>
                        )}
                        {isDirectFinalPossible && totalQualified === 2 && (
                          <div className="text-xs text-green-600 mt-1">✓ Perfect match</div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Step 3: Stage 1 Format */}
          {step === 3 && (() => {
            const hasOddGroup = groupDistribution.some(size => size % 2 !== 0)
            
            // If any group has odd number, show message and auto-select Round Robin
            if (hasOddGroup) {
              return (
                <div>
                  <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 3: Stage 1 (Group Stage) Format</h2>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start">
                      <div className="text-3xl mr-4">ℹ️</div>
                      <div>
                        <h3 className="font-semibold text-navy-blue mb-2">Round Robin Selected Automatically</h3>
                        <p className="text-gray-600 text-sm">
                          One or more groups have an odd number of players ({groupDistribution.join(', ')} players per group).
                          <br />
                          Knockout format requires even numbers in each group, so <strong>Round Robin</strong> has been automatically selected.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-navy-blue mb-4">
                      Selected Format <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 border-2 rounded-lg text-center border-lime-green bg-lime-green bg-opacity-10">
                        <div className="text-3xl mb-2">🔄</div>
                        <div className="font-semibold text-navy-blue">Round Robin</div>
                        <div className="text-sm text-gray-600 mt-2">All teams in group play each other</div>
                        <div className="text-xs text-green-600 mt-2 font-semibold">✓ Selected</div>
                      </div>
                      <div className="p-6 border-2 rounded-lg text-center border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
                        <div className="text-3xl mb-2">⚔️</div>
                        <div className="font-semibold text-gray-400">Knockout</div>
                        <div className="text-sm text-gray-400 mt-2">Knockout within each group</div>
                        <div className="text-xs text-red-500 mt-2 font-semibold">Not available (odd groups)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            
            // If all groups have even numbers, show selection options
            return (
              <div>
                <h2 className="text-2xl font-bold text-navy-blue mb-6">Step 3: Stage 1 (Group Stage) Format</h2>
                
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
            )
          })()}

          {/* Step 4: Review and Generate */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-navy-blue mb-6">Review & Generate</h2>
              
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
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="btn-primary"
                disabled={step === 1 && groupDistribution.length > 0 && (() => {
                  const minSize = Math.min(...groupDistribution)
                  const maxSize = Math.max(...groupDistribution)
                  return formData.minPlayersPerGroup > minSize || formData.maxPlayersPerGroup < maxSize
                })()}
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

