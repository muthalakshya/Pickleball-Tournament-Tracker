import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchApi } from '../api/matchApi';
import { tournamentApi } from '../api/tournamentApi';
import { useSocket } from '../hooks/useSocket';
import MatchCard from '../components/MatchCard';
import toast from 'react-hot-toast';

const MatchControl = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('all'); // all, upcoming, in-progress, completed
  const [loading, setLoading] = useState(true);

  // Socket.IO connection
  const socket = useSocket(id);

  useEffect(() => {
    fetchTournament();
    fetchMatches();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('match_started', (match) => {
      setMatches(prev => prev.map(m => m._id === match._id ? match : m));
      toast.success('Match started');
    });

    socket.on('score_updated', (match) => {
      setMatches(prev => prev.map(m => m._id === match._id ? match : m));
    });

    socket.on('match_completed', (match) => {
      setMatches(prev => prev.map(m => m._id === match._id ? match : m));
      toast.success('Match completed');
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
      toast.error('Failed to load tournament');
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await matchApi.getMatches(id);
      setMatches(response.data.data);
    } catch (error) {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true;
    return match.status === filter;
  });

  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const round = match.round || 'other';
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link to="/dashboard" className="text-primary-600 hover:text-primary-700">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {tournament?.name || 'Match Control'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          {['all', 'upcoming', 'in-progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 font-medium ${
                filter === status
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading matches...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No matches found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMatches).map(([round, roundMatches]) => (
              <div key={round}>
                <h2 className="text-xl font-semibold mb-4 capitalize">
                  {round.replace('-', ' ')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match._id}
                      match={match}
                      tournament={tournament}
                      onUpdate={fetchMatches}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchControl;

