/**
 * Utility functions for displaying participant information
 * Always shows players instead of team names
 */

/**
 * Get display name from participant
 * Returns players joined with " & " or "TBD" if no players
 */
export const getParticipantDisplayName = (participant) => {
  if (!participant) return 'TBD'
  
  if (participant.players && participant.players.length > 0) {
    return participant.players.join(' & ')
  }
  
  // Fallback to name if players array is empty (for backward compatibility)
  return participant.name || 'TBD'
}

/**
 * Get participant display name for matches
 * Shows players or TBD
 */
export const getMatchParticipantName = (participant) => {
  if (!participant) return 'TBD'
  
  if (participant.players && participant.players.length > 0) {
    return participant.players.join(' & ')
  }
  
  return participant.name || 'TBD'
}

