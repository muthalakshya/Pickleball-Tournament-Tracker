import { useState } from 'react';
import { matchApi } from '../api/matchApi';
import toast from 'react-hot-toast';

const MatchCard = ({ match, tournament, onUpdate, readOnly = false }) => {
  const [score1, setScore1] = useState(match.score1 || 0);
  const [score2, setScore2] = useState(match.score2 || 0);
  const [updating, setUpdating] = useState(false);

  const getParticipantName = (participant) => {
    if (!participant) return 'TBD';
    if (tournament?.tournamentType === 'singles') {
      return participant.name || 'Unknown';
    } else {
      return participant.name || `${participant.player1?.name} & ${participant.player2?.name}`;
    }
  };

  const participant1 = tournament?.tournamentType === 'singles' ? match.player1 : match.team1;
  const participant2 = tournament?.tournamentType === 'singles' ? match.player2 : match.team2;

  const handleStartMatch = async () => {
    setUpdating(true);
    try {
      await matchApi.startMatch(match._id, { court: match.court || 1 });
      toast.success('Match started');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to start match');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateScore = async () => {
    setUpdating(true);
    try {
      await matchApi.updateScore(match._id, { score1, score2 });
      toast.success('Score updated');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to update score');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteMatch = async () => {
    if (!match.winner) {
      toast.error('Match must have a winner');
      return;
    }
    setUpdating(true);
    try {
      await matchApi.completeMatch(match._id);
      toast.success('Match completed');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to complete match');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-secondary text-secondary-foreground border-secondary';
      case 'completed':
        return 'bg-muted text-muted-foreground border-border';
      case 'bye':
        return 'bg-accent text-accent-foreground border-accent';
      default:
        return 'bg-background text-foreground border-border';
    }
  };

  return (
    <div className={`bg-background rounded-lg shadow-pickle p-4 border-2 ${getStatusColor(match.status)} hover:shadow-glow transition-all`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium uppercase text-foreground">{match.round}</span>
        {match.court && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Court {match.court}</span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className={`font-medium ${match.winner?.toString() === participant1?._id?.toString() ? 'text-secondary' : 'text-foreground'}`}>
            {getParticipantName(participant1)}
          </span>
          {!readOnly && match.status === 'in-progress' ? (
            <input
              type="number"
              value={score1}
              onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border border-border bg-input rounded text-center focus:outline-none focus:ring-2 focus:ring-ring"
              min="0"
            />
          ) : (
            <span className="font-bold text-lg text-navy">{match.score1 || 0}</span>
          )}
        </div>

        <div className="text-center text-foreground text-sm">VS</div>

        <div className="flex justify-between items-center">
          <span className={`font-medium ${match.winner?.toString() === participant2?._id?.toString() ? 'text-secondary' : 'text-foreground'}`}>
            {getParticipantName(participant2)}
          </span>
          {!readOnly && match.status === 'in-progress' ? (
            <input
              type="number"
              value={score2}
              onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border border-border bg-input rounded text-center focus:outline-none focus:ring-2 focus:ring-ring"
              min="0"
            />
          ) : (
            <span className="font-bold text-lg text-navy">{match.score2 || 0}</span>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="mt-4 space-y-2">
          {match.status === 'upcoming' && (
            <button
              onClick={handleStartMatch}
              disabled={updating}
              className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-all shadow-pickle"
            >
              Start Match
            </button>
          )}

          {match.status === 'in-progress' && (
            <>
              <button
                onClick={handleUpdateScore}
                disabled={updating}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-all shadow-pickle"
              >
                Update Score
              </button>
              {match.winner && (
                <button
                  onClick={handleCompleteMatch}
                  disabled={updating}
                  className="w-full px-3 py-2 bg-muted text-muted-foreground rounded hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Complete Match
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchCard;

