import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { scrollToTop } from '../../utils/scrollToTop'

const GroupTournamentWizard = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1)
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const prevStepRef = useRef(1)

  const [formData, setFormData] = useState({
    useGroups: true,
    numGroups: 4,
    minPlayersPerGroup: 3,
    maxPlayersPerGroup: 5,
    tournamentStructure: '',
    topPlayersPerGroup: 2,
    stage1Format: '',
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

  const calculateGroupDistribution = (numGroups, totalPlayers) => {
    const baseSize = Math.floor(totalPlayers / numGroups)
    const remainder = totalPlayers % numGroups
    
    const distribution = []
    for (let i = 0; i < numGroups; i++) {
      distribution.push(baseSize + (i < remainder ? 1 : 0))
    }
    
    return distribution
  }

  useEffect(() => {
    if (formData.numGroups > 0 && participants.length > 0) {
      const dist = calculateGroupDistribution(formData.numGroups, participants.length)
      setGroupDistribution(dist)
    }
  }, [formData.numGroups, participants.length])

  useEffect(() => {
    if (step === 3 && groupDistribution.length > 0) {
      const hasOddGroup = groupDistribution.some(size => size % 2 !== 0)
      const isForwardNavigation = prevStepRef.current === 2
      
      if (hasOddGroup && isForwardNavigation && !formData.stage1Format) {
        setFormData(prev => ({ ...prev, stage1Format: 'roundRobin' }))
        setTimeout(() => {
          setStep(4)
        }, 0)
      }
    }
    
    prevStepRef.current = step
  }, [step, groupDistribution, formData.stage1Format])

  const handleNext = () => {
    if (step === 1) {
      if (formData.numGroups < 2) {
        alert('Please enter at least 2 groups')
        return
      }
      if (participants.length < formData.numGroups) {
        alert(`You need at least ${formData.numGroups} participants for ${formData.numGroups} groups`)
        return
      }
      
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
      
      setFormData({ ...formData, tournamentStructure: '' })
    }
    
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
    
    if (step === 3) {
      const hasOddGroup = groupDistribution.some(size => size % 2 !== 0)
      
      if (hasOddGroup) {
        if (!formData.stage1Format) {
          setFormData(prev => ({ ...prev, stage1Format: 'roundRobin' }))
        }
      } else {
        if (!formData.stage1Format) {
          alert('Please select Stage 1 format')
          return
        }
      }
    }
    
    prevStepRef.current = step
    setStep(step + 1)
    scrollToTop()
  }

  const handleBack = () => {
    if (step > 1) {
      prevStepRef.current = step
      setStep(step - 1)
      scrollToTop()
    }
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.generateGroupTournament(id, formData)
      alert('Group tournament fixtures generated successfully!')
      scrollToTop()
      navigate(`/admin/tournaments/custom/${id}/manage`)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate fixtures')
      setError(err.response?.data?.message || 'Failed to generate fixtures')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-blue text-lg font-semibold">Loading tournament...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-600 mb-4 text-lg font-semibold">{error || 'Tournament not found'}</p>
          <button
            onClick={() => navigate(`/admin/tournaments/custom/${id}/manage`)}
            className="btn-primary inline-block"
          >
            ← Back to Manage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-blue mb-2">
                  Tournament Fixture Setup
                </h1>
                <p className="text-sm sm:text-base text-gray-600">{tournament.name}</p>
              </div>
              <button
                onClick={() => {
                  scrollToTop()
                  navigate(`/admin/tournaments/custom/${id}/manage`)
                }}
                className="inline-flex items-center text-navy-blue hover:text-forest-green font-semibold text-sm sm:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Manage
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                    step >= s 
                      ? 'bg-gradient-to-r from-lime-green to-forest-green border-lime-green text-white shadow-lg' 
                      : 'border-gray-300 text-gray-400 bg-white/40'
                  }`}>
                    <span className="text-sm sm:text-base font-bold">{s}</span>
                  </div>
                  {s < 4 && (
                    <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all ${
                      step > s ? 'bg-gradient-to-r from-lime-green to-forest-green' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs sm:text-sm text-gray-600">
              <span className={step >= 1 ? 'text-navy-blue font-semibold' : ''}>Groups</span>
              <span className={step >= 2 ? 'text-navy-blue font-semibold' : ''}>Structure</span>
              <span className={step >= 3 ? 'text-navy-blue font-semibold' : ''}>Format</span>
              <span className={step >= 4 ? 'text-navy-blue font-semibold' : ''}>Review</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-white/20">
          {/* Step 1: Group Configuration */}
          {step === 1 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4 sm:mb-6">Step 1: Group Configuration</h2>
              
              <div className="space-y-4 sm:space-y-6">
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-2">
                      Min Players per Group
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={formData.minPlayersPerGroup}
                      onChange={(e) => setFormData({ ...formData, minPlayersPerGroup: parseInt(e.target.value) || 2 })}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Group Distribution Preview */}
                {groupDistribution.length > 0 && (() => {
                  const minSize = Math.min(...groupDistribution)
                  const maxSize = Math.max(...groupDistribution)
                  const isValid = formData.minPlayersPerGroup <= minSize && formData.maxPlayersPerGroup >= maxSize
                  
                  return (
                    <div className={`border-2 rounded-xl p-4 sm:p-6 ${isValid ? 'bg-blue-50/80 backdrop-blur-sm border-blue-200' : 'bg-red-50/80 backdrop-blur-sm border-red-300'}`}>
                      <h3 className="font-semibold text-navy-blue mb-2 text-sm sm:text-base">Group Distribution Preview</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3">
                        Total Players: <span className="font-semibold text-navy-blue">{participants.length}</span> | Groups: <span className="font-semibold text-navy-blue">{formData.numGroups}</span>
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {groupDistribution.map((size, index) => (
                          <div key={index} className="bg-white/70 backdrop-blur-sm px-3 py-2 rounded-lg border-2 border-blue-300 shadow-sm">
                            <span className="font-semibold text-navy-blue text-sm">Group {String.fromCharCode(65 + index)}:</span>
                            <span className="ml-2 text-gray-700 text-sm">{size} players</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Distribution: <span className="font-semibold">{groupDistribution.join(', ')}</span> | Min: <span className="font-semibold">{minSize}</span>, Max: <span className="font-semibold">{maxSize}</span>
                      </p>
                      {!isValid && (
                        <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 mt-3">
                          <p className="text-xs sm:text-sm text-red-700 font-semibold mb-1">⚠️ Invalid Min/Max Settings!</p>
                          <p className="text-xs text-red-600">
                            Your min ({formData.minPlayersPerGroup}) and max ({formData.maxPlayersPerGroup}) must be between {minSize} and {maxSize} (inclusive).
                            <br />
                            Please adjust: Min ≤ {minSize} and Max ≥ {maxSize}
                          </p>
                        </div>
                      )}
                      {isValid && (
                        <p className="text-xs sm:text-sm text-green-600 font-semibold">✓ Min/Max settings are valid</p>
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
            
            return (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4 sm:mb-6">Step 2: Tournament Structure</h2>
                
                <div className="space-y-4 sm:space-y-6">
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-green focus:border-lime-green text-sm sm:text-base"
                    />
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      Total qualified: <span className="font-semibold text-navy-blue">{totalQualified} players</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-blue mb-4">
                      Select Tournament Structure <span className="text-red-500">*</span>
                    </label>
                    
                    {totalQualified !== 8 && totalQualified !== 4 && totalQualified !== 2 && (
                      <div className="bg-yellow-50/80 backdrop-blur-sm border-2 border-yellow-200 rounded-xl p-3 sm:p-4 mb-4">
                        <p className="text-xs sm:text-sm text-yellow-800">
                          <strong>⚠️ No valid tournament structure available</strong>
                          <br />
                          With {totalQualified} qualified players, you need exactly 2, 4, or 8 players.
                          <br />
                          <span className="text-xs">Adjust "Top Players per Group" or "Number of Groups" to get a valid combination.</span>
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <button
                        onClick={() => setFormData({ ...formData, tournamentStructure: 'quarterfinal' })}
                        disabled={!isQuarterfinalPossible}
                        className={`p-4 sm:p-6 border-2 rounded-xl text-center transition-all ${
                          formData.tournamentStructure === 'quarterfinal'
                            ? 'border-lime-green bg-lime-green/20 shadow-lg'
                            : isQuarterfinalPossible
                            ? 'border-gray-300 hover:border-lime-green hover:bg-white/40 cursor-pointer bg-white/60 backdrop-blur-sm'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`font-semibold text-sm sm:text-base ${isQuarterfinalPossible ? 'text-navy-blue' : 'text-gray-400'}`}>
                          Quarterfinal
                        </div>
                        <div className={`text-xs mt-1 sm:mt-2 ${isQuarterfinalPossible ? 'text-gray-600' : 'text-gray-400'}`}>
                          8 teams required
                        </div>
                        {!isQuarterfinalPossible && (
                          <div className="text-xs text-red-500 mt-1">
                            {totalQualified < 8 ? `Need ${8 - totalQualified} more` : `${totalQualified - 8} too many`}
                          </div>
                        )}
                        {isQuarterfinalPossible && totalQualified === 8 && (
                          <div className="text-xs text-green-600 mt-1 font-semibold">✓ Perfect match</div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setFormData({ ...formData, tournamentStructure: 'semifinal' })}
                        disabled={!isSemifinalPossible}
                        className={`p-4 sm:p-6 border-2 rounded-xl text-center transition-all ${
                          formData.tournamentStructure === 'semifinal'
                            ? 'border-lime-green bg-lime-green/20 shadow-lg'
                            : isSemifinalPossible
                            ? 'border-gray-300 hover:border-lime-green hover:bg-white/40 cursor-pointer bg-white/60 backdrop-blur-sm'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`font-semibold text-sm sm:text-base ${isSemifinalPossible ? 'text-navy-blue' : 'text-gray-400'}`}>
                          Semifinal
                        </div>
                        <div className={`text-xs mt-1 sm:mt-2 ${isSemifinalPossible ? 'text-gray-600' : 'text-gray-400'}`}>
                          4 teams required
                        </div>
                        {!isSemifinalPossible && (
                          <div className="text-xs text-red-500 mt-1">
                            {totalQualified < 4 ? `Need ${4 - totalQualified} more` : `${totalQualified - 4} too many`}
                          </div>
                        )}
                        {isSemifinalPossible && totalQualified === 4 && (
                          <div className="text-xs text-green-600 mt-1 font-semibold">✓ Perfect match</div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setFormData({ ...formData, tournamentStructure: 'directFinal' })}
                        disabled={!isDirectFinalPossible}
                        className={`p-4 sm:p-6 border-2 rounded-xl text-center transition-all ${
                          formData.tournamentStructure === 'directFinal'
                            ? 'border-lime-green bg-lime-green/20 shadow-lg'
                            : isDirectFinalPossible
                            ? 'border-gray-300 hover:border-lime-green hover:bg-white/40 cursor-pointer bg-white/60 backdrop-blur-sm'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`font-semibold text-sm sm:text-base ${isDirectFinalPossible ? 'text-navy-blue' : 'text-gray-400'}`}>
                          Direct Final
                        </div>
                        <div className={`text-xs mt-1 sm:mt-2 ${isDirectFinalPossible ? 'text-gray-600' : 'text-gray-400'}`}>
                          2 teams required
                        </div>
                        {!isDirectFinalPossible && (
                          <div className="text-xs text-red-500 mt-1">
                            {totalQualified < 2 ? `Need ${2 - totalQualified} more` : `${totalQualified - 2} too many`}
                          </div>
                        )}
                        {isDirectFinalPossible && totalQualified === 2 && (
                          <div className="text-xs text-green-600 mt-1 font-semibold">✓ Perfect match</div>
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
            
            if (hasOddGroup) {
              return (
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4 sm:mb-6">Step 3: Stage 1 (Group Stage) Format</h2>
                  
                  <div className="bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200 rounded-xl p-4 sm:p-6 mb-6">
                    <div className="flex items-start">
                      <div className="text-2xl sm:text-3xl mr-3 sm:mr-4">ℹ️</div>
                      <div>
                        <h3 className="font-semibold text-navy-blue mb-2 text-sm sm:text-base">Round Robin Selected Automatically</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 sm:p-6 border-2 rounded-xl text-center border-lime-green bg-lime-green/20 shadow-lg">
                        <div className="text-2xl sm:text-3xl mb-2">🔄</div>
                        <div className="font-semibold text-navy-blue text-sm sm:text-base">Round Robin</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-2">All teams in group play each other</div>
                        <div className="text-xs text-green-600 mt-2 font-semibold">✓ Selected</div>
                      </div>
                      <div className="p-4 sm:p-6 border-2 rounded-xl text-center border-gray-200 bg-gray-50/80 backdrop-blur-sm opacity-50 cursor-not-allowed">
                        <div className="text-2xl sm:text-3xl mb-2">⚔️</div>
                        <div className="font-semibold text-gray-400 text-sm sm:text-base">Knockout</div>
                        <div className="text-xs sm:text-sm text-gray-400 mt-2">Knockout within each group</div>
                        <div className="text-xs text-red-500 mt-2 font-semibold">Not available (odd groups)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            
            return (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4 sm:mb-6">Step 3: Stage 1 (Group Stage) Format</h2>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-navy-blue mb-4">
                    Select Stage 1 Format <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, stage1Format: 'roundRobin' })}
                      className={`p-4 sm:p-6 border-2 rounded-xl text-center transition-all ${
                        formData.stage1Format === 'roundRobin'
                          ? 'border-lime-green bg-lime-green/20 shadow-lg'
                          : 'border-gray-300 hover:border-lime-green hover:bg-white/40 bg-white/60 backdrop-blur-sm'
                      }`}
                    >
                      <div className="text-2xl sm:text-3xl mb-2">🔄</div>
                      <div className="font-semibold text-navy-blue text-sm sm:text-base">Round Robin</div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-2">All teams in group play each other</div>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, stage1Format: 'knockout' })}
                      className={`p-4 sm:p-6 border-2 rounded-xl text-center transition-all ${
                        formData.stage1Format === 'knockout'
                          ? 'border-lime-green bg-lime-green/20 shadow-lg'
                          : 'border-gray-300 hover:border-lime-green hover:bg-white/40 bg-white/60 backdrop-blur-sm'
                      }`}
                    >
                      <div className="text-2xl sm:text-3xl mb-2">⚔️</div>
                      <div className="font-semibold text-navy-blue text-sm sm:text-base">Knockout</div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-2">Knockout within each group</div>
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Step 4: Review and Generate */}
          {step === 4 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-blue mb-4 sm:mb-6">Review & Generate</h2>
              
              <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Tournament Format:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base">Group-based</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Number of Groups:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base">{formData.numGroups}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Group Distribution:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base">{groupDistribution.join(', ')}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Tournament Structure:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base capitalize">
                    {formData.tournamentStructure === 'quarterfinal' ? 'Quarterfinal' :
                     formData.tournamentStructure === 'semifinal' ? 'Semifinal' :
                     formData.tournamentStructure === 'directFinal' ? 'Direct Final' : 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Top Players per Group:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base">{formData.topPlayersPerGroup}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Total Qualified:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base">{formData.topPlayersPerGroup * formData.numGroups}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Stage 1 Format:</span>
                  <span className="font-semibold text-navy-blue text-sm sm:text-base capitalize">
                    {formData.stage1Format === 'roundRobin' ? 'Round Robin' :
                     formData.stage1Format === 'knockout' ? 'Knockout' : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 bg-yellow-50/80 backdrop-blur-sm border-2 border-yellow-200 rounded-xl p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-yellow-800">
                  <strong>Note:</strong> This will generate all fixtures for the group tournament. 
                  Standings will be calculated based on wins, then point difference.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
            <button
              onClick={() => { 
                if (step > 1) {
                  handleBack();
                } else {
                  scrollToTop()
                  navigate(`/admin/tournaments/custom/${id}/manage`)
                }
              }}
              className="btn-secondary text-sm sm:text-base px-6 py-3 w-full sm:w-auto"
            >
              ← Back
            </button>
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="btn-primary text-sm sm:text-base px-6 py-3 w-full sm:w-auto"
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
                className="btn-primary text-sm sm:text-base px-6 py-3 w-full sm:w-auto"
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
