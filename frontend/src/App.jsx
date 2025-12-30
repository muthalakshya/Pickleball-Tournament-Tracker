import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TournamentSetup from './pages/TournamentSetup';
import MatchControl from './pages/MatchControl';
import PublicTournamentView from './pages/PublicTournamentView';

// Components
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route path="/tournament/:id/public" element={<PublicTournamentView />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournament/new"
          element={
            <PrivateRoute>
              <TournamentSetup />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournament/:id/edit"
          element={
            <PrivateRoute>
              <TournamentSetup />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournament/:id/matches"
          element={
            <PrivateRoute>
              <MatchControl />
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />}
        />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;

