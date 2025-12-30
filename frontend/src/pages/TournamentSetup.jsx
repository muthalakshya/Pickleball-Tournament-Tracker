import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tournamentApi } from '../api/tournamentApi';
import { playerApi } from '../api/playerApi';
import { teamApi } from '../api/teamApi';
import toast from 'react-hot-toast';

const TournamentSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    courts: 1,
    tournamentType: 'singles',
    format: 'knockout',
    pointsToWin: 11,
    scoringSystem: 'rally',
  });

  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerSeed, setNewPlayerSeed] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchTournament();
    }
  }, [id]);

  useEffect(() => {
    if (tournament._id && tournament.tournamentType === 'singles') {
      fetchPlayers();
    }
  }, [tournament._id, tournament.tournamentType]);

  const fetchTournament = async () => {
    try {
      const response = await tournamentApi.getTournament(id);
      const data = response.data.data;
      setTournament({
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
        endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
      });
    } catch (error) {
      toast.error('Failed to load tournament');
      navigate('/dashboard');
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await playerApi.getPlayers(tournament._id);
      setPlayers(response.data.data);
    } catch (error) {
      toast.error('Failed to load players');
    }
  };

  const handleTournamentChange = (e) => {
    setTournament({
      ...tournament,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveTournament = async () => {
    setLoading(true);
    try {
      let response;
      if (isEdit) {
        response = await tournamentApi.updateTournament(id, tournament);
      } else {
        response = await tournamentApi.createTournament(tournament);
        setTournament(response.data.data);
      }
      toast.success('Tournament saved!');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast.error('Please enter a player name');
      return;
    }

    try {
      const response = await playerApi.createPlayer(tournament._id, {
        name: newPlayerName,
        seed: newPlayerSeed ? parseInt(newPlayerSeed) : null,
      });
      setPlayers([...players, response.data.data]);
      setNewPlayerName('');
      setNewPlayerSeed('');
      toast.success('Player added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add player');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    try {
      await playerApi.deletePlayer(playerId);
      setPlayers(players.filter(p => p._id !== playerId));
      toast.success('Player deleted');
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const handleGenerateFixtures = async () => {
    if (players.length < 2) {
      toast.error('Need at least 2 players to generate fixtures');
      return;
    }

    setLoading(true);
    try {
      await tournamentApi.generateFixtures(tournament._id);
      toast.success('Fixtures generated!');
      navigate(`/tournament/${tournament._id}/matches`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate fixtures');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">
            {isEdit ? 'Edit Tournament' : 'Create Tournament'}
          </h1>

          {/* Step 1: Tournament Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={tournament.name}
                  onChange={handleTournamentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={tournament.location}
                  onChange={handleTournamentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={tournament.startDate}
                    onChange={handleTournamentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={tournament.endDate}
                    onChange={handleTournamentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Courts *
                </label>
                <input
                  type="number"
                  name="courts"
                  value={tournament.courts}
                  onChange={handleTournamentChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Type *
                </label>
                <select
                  name="tournamentType"
                  value={tournament.tournamentType}
                  onChange={handleTournamentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format *
                </label>
                <select
                  name="format"
                  value={tournament.format}
                  onChange={handleTournamentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="knockout">Knockout</option>
                  <option value="round-robin">Round Robin</option>
                  <option value="group">Group Stage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points to Win *
                </label>
                <select
                  name="pointsToWin"
                  value={tournament.pointsToWin}
                  onChange={handleTournamentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="11">11</option>
                  <option value="15">15</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scoring System *
                </label>
                <select
                  name="scoringSystem"
                  value={tournament.scoringSystem}
                  onChange={handleTournamentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="rally">Rally Scoring</option>
                  <option value="traditional">Traditional Pickleball</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTournament}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Add Players */}
          {step === 2 && tournament.tournamentType === 'singles' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Add Players</h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Seed (optional)"
                  value={newPlayerSeed}
                  onChange={(e) => setNewPlayerSeed(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleAddPlayer}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add
                </button>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Players ({players.length})</h3>
                <div className="space-y-2">
                  {players.map((player) => (
                    <div key={player._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>
                        {player.name} {player.seed && `(Seed ${player.seed})`}
                      </span>
                      <button
                        onClick={() => handleDeletePlayer(player._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerateFixtures}
                  disabled={loading || players.length < 2}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Fixtures'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentSetup;

