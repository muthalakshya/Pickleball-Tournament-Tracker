import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { tournamentApi } from '../api/tournamentApi';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentApi.getTournaments();
      setTournaments(response.data.data);
    } catch (error) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) {
      return;
    }

    try {
      await tournamentApi.deleteTournament(id);
      toast.success('Tournament deleted');
      fetchTournaments();
    } catch (error) {
      toast.error('Failed to delete tournament');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-secondary text-secondary-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-accent text-accent-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border shadow-pickle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-navy">Tournament Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground">Welcome, {user?.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-white bg-accent rounded-md hover:opacity-90 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-navy">My Tournaments</h2>
          <Link
            to="/tournament/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 shadow-pickle transition-all"
          >
            Create Tournament
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-foreground">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 bg-background rounded-lg shadow-pickle border border-border">
            <p className="text-foreground mb-4">No tournaments yet</p>
            <Link
              to="/tournament/new"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 shadow-pickle transition-all"
            >
              Create Your First Tournament
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament._id} className="bg-background rounded-lg shadow-pickle border border-border p-6 hover:shadow-glow transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-navy">{tournament.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-2">{tournament.location}</p>
                <p className="text-sm text-foreground mb-4">
                  {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                </p>
                <div className="flex gap-2 mt-4">
                  <Link
                    to={`/tournament/${tournament._id}/matches`}
                    className="flex-1 text-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all"
                  >
                    Manage Matches
                  </Link>
                  <Link
                    to={`/tournament/${tournament._id}/edit`}
                    className="px-3 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:opacity-90 transition-all"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(tournament._id)}
                    className="px-3 py-2 text-sm bg-accent text-accent-foreground rounded-md hover:opacity-90 transition-all"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Link
                    to={`/tournament/${tournament._id}/public`}
                    target="_blank"
                    className="text-sm text-primary hover:opacity-80 transition-colors"
                  >
                    View Public Page →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

