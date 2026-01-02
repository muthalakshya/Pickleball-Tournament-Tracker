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
      // Handle different response structures
      if (response.success && response.data) {
        setTournament(response.data);
      } else if (response.data) {
        setTournament(response.data);
      }
    } catch (error) {
      console.error('Failed to load tournament', error);
      toast.error('Failed to load tournament');
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await matchApi.getMatches(id);
      // Handle different response structures
      let matchesData = [];
      if (response.success && response.data) {
        matchesData = response.data;
      } else if (response.data) {
        matchesData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        matchesData = response;
      }
      setMatches(matchesData || []); // Ensure it's always an array
    } catch (error) {
      console.error('Failed to load matches', error);
      toast.error('Failed to load matches');
      setMatches([]); // Ensure matches is always an array
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = (matches || []).filter(match => {
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
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link to="/dashboard" className="text-primary hover:opacity-80 mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-navy mt-2">
                {tournament?.name || 'Match Control'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="glass-card rounded-lg p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'upcoming', 'in-progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === status
                    ? 'bg-primary text-navy shadow-pickle'
                    : 'glass-button text-foreground hover:bg-primary/10'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-foreground">Loading matches...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="glass-card text-center py-12 rounded-lg">
            <p className="text-foreground">No matches found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMatches).map(([round, roundMatches]) => (
              <div key={round}>
                <h2 className="text-xl font-semibold mb-4 capitalize text-navy">
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

