// Simplified bracket view component
// TODO: Implement full bracket visualization with proper positioning

const BracketView = ({ matches, tournament }) => {
  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round || 'other';
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  const roundOrder = ['quarterfinal', 'semifinal', 'final'];

  const getParticipantName = (participant) => {
    if (!participant) return 'TBD';
    if (tournament?.tournamentType === 'singles') {
      return participant.name || 'Unknown';
    } else {
      return participant.name || `${participant.player1?.name} & ${participant.player2?.name}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Tournament Bracket</h2>
      
      <div className="space-y-8">
        {roundOrder.map((round) => {
          const roundMatches = matchesByRound[round] || [];
          if (roundMatches.length === 0) return null;

          return (
            <div key={round}>
              <h3 className="text-lg font-semibold mb-4 capitalize">
                {round.replace('-', ' ')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roundMatches.map((match) => {
                  const participant1 = tournament?.tournamentType === 'singles' ? match.player1 : match.team1;
                  const participant2 = tournament?.tournamentType === 'singles' ? match.player2 : match.team2;
                  
                  return (
                    <div
                      key={match._id}
                      className={`p-4 border-2 rounded ${
                        match.status === 'completed'
                          ? 'border-green-500 bg-green-50'
                          : match.status === 'in-progress'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className={`font-medium ${
                          match.winner?.toString() === participant1?._id?.toString() ? 'text-green-600' : ''
                        }`}>
                          {getParticipantName(participant1)}
                        </div>
                        <div className="text-center text-gray-500">vs</div>
                        <div className={`font-medium ${
                          match.winner?.toString() === participant2?._id?.toString() ? 'text-green-600' : ''
                        }`}>
                          {getParticipantName(participant2)}
                        </div>
                        {match.status === 'completed' && (
                          <div className="text-center text-sm font-bold mt-2">
                            {match.score1} - {match.score2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* TODO: Implement proper bracket visualization with connecting lines */}
      <div className="mt-8 text-sm text-gray-500 text-center">
        Note: Full bracket visualization with connecting lines is a TODO for future enhancement
      </div>
    </div>
  );
};

export default BracketView;

