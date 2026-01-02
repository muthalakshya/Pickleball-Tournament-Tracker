/**
 * Standings Calculation Service (Frontend)
 * 
 * Calculates tournament standings from participants and completed matches.
 */

/**
 * Calculate Standings
 * 
 * Calculates basic statistics for each participant based on completed matches.
 */
export const calculateStandings = (participants, completedMatches) => {
  const standingsMap = new Map()

  participants.forEach(participant => {
    standingsMap.set(participant._id.toString(), {
      participant: {
        id: participant._id,
        name: participant.name,
        players: participant.players
      },
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifference: 0,
        headToHead: new Map()
      }
    })
  })

  completedMatches.forEach(match => {
    const pAId = match.participantA?._id?.toString()
    const pBId = match.participantB?._id?.toString()

    if (!pAId || !pBId) return // Skip matches with TBD

    const standingA = standingsMap.get(pAId)
    const standingB = standingsMap.get(pBId)

    if (!standingA || !standingB) return

    standingA.stats.matchesPlayed++
    standingB.stats.matchesPlayed++

    standingA.stats.pointsFor += match.score.a || 0
    standingA.stats.pointsAgainst += match.score.b || 0
    standingB.stats.pointsFor += match.score.b || 0
    standingB.stats.pointsAgainst += match.score.a || 0

    if (match.score.a > match.score.b) {
      standingA.stats.wins++
      standingB.stats.losses++
      standingA.stats.headToHead.set(pBId, 'win')
      standingB.stats.headToHead.set(pAId, 'loss')
    } else if (match.score.b > match.score.a) {
      standingB.stats.wins++
      standingA.stats.losses++
      standingB.stats.headToHead.set(pAId, 'win')
      standingA.stats.headToHead.set(pBId, 'loss')
    }
  })

  // Calculate point difference
  standingsMap.forEach(standing => {
    standing.stats.pointDifference = standing.stats.pointsFor - standing.stats.pointsAgainst
    standing.stats.winRate = standing.stats.matchesPlayed > 0
      ? (standing.stats.wins / standing.stats.matchesPlayed * 100).toFixed(1)
      : 0
  })

  return Array.from(standingsMap.values())
}

/**
 * Sort Standings
 * 
 * Sorts standings by:
 * 1. Wins (descending)
 * 2. Point Difference (descending)
 * 3. Points Scored (descending)
 * 4. Head-to-head result
 */
export const sortStandings = (standings, completedMatches) => {
  return standings.sort((a, b) => {
    // 1. Wins
    if (b.stats.wins !== a.stats.wins) {
      return b.stats.wins - a.stats.wins
    }
    // 2. Point Difference
    if (b.stats.pointDifference !== a.stats.pointDifference) {
      return b.stats.pointDifference - a.stats.pointDifference
    }
    // 3. Points Scored
    if (b.stats.pointsFor !== a.stats.pointsFor) {
      return b.stats.pointsFor - a.stats.pointsAgainst
    }
    // 4. Head-to-head
    const h2hA = a.stats.headToHead.get(b.participant.id.toString())
    const h2hB = b.stats.headToHead.get(a.participant.id.toString())

    if (h2hA === 'win' && h2hB === 'loss') {
      return -1
    }
    if (h2hA === 'loss' && h2hB === 'win') {
      return 1
    }

    return 0
  })
}

