import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tournamentApi } from '../api/tournamentApi';
import { matchApi } from '../api/matchApi';
import { useSocket } from '../hooks/useSocket';
import MatchCard from '../components/MatchCard';
import BracketView from '../components/BracketView';

const PublicTournamentView = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [view, setView] = useState('list'); // list or bracket
  const [loading, setLoading] = useState(true);

  // Socket.IO connection for real-time updates
  const socket = useSocket(id);

  useEffect(() => {
    fetchTournament();
    fetchMatches();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('match_started', (match) => {
      setMatches(prev => prev.map(m => m._id === match._id ? match : m));
    });

    socket.on('score_updated', (match) => {
      setMatches(prev => prev.map(m => m._id === match._id ? match : m));
    });

    socket.on('match_completed', (match) => {
      setMatches(prev => prev.map(m => m._id === match._id ? match : m));
    });

    return () => {
      socket.off('match_started');
      socket.off('score_updated');
      socket.off('match_completed');
    };
  }, [socket]);

  const fetchTournament = async () => {
    try {
      const response = await tournamentApi.getTournament(id);
      setTournament(response.data.data);
    } catch (error) {
      console.error('Failed to load tournament');
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await matchApi.getMatches(id);
      setMatches(response.data.data);
    } catch (error) {
      console.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const ongoingMatches = matches.filter(m => m.status === 'in-progress');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming').slice(0, 5);
  const completedMatches = matches.filter(m => m.status === 'completed').slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading tournament...</div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-red-600">Tournament not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
          <p className="text-gray-600 mt-2">{tournament.location}</p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md ${
                view === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setView('bracket')}
              className={`px-4 py-2 rounded-md ${
                view === 'bracket' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Bracket View
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'bracket' ? (
          <BracketView matches={matches} tournament={tournament} />
        ) : (
          <>
            {/* Ongoing Matches */}
            {ongoingMatches.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary-600">Live Matches</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ongoingMatches.map((match) => (
                    <MatchCard
                      key={match._id}
                      match={match}
                      tournament={tournament}
                      readOnly
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Upcoming Matches</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingMatches.map((match) => (
                    <MatchCard
                      key={match._id}
                      match={match}
                      tournament={tournament}
                      readOnly
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Matches */}
            {completedMatches.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">Recent Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedMatches.map((match) => (
                    <MatchCard
                      key={match._id}
                      match={match}
                      tournament={tournament}
                      readOnly
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PublicTournamentView;

