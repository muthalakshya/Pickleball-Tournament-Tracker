import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import TournamentView from './pages/TournamentView'
import MatchList from './pages/MatchList'
import BracketView from './pages/BracketView'
import StandingsView from './pages/StandingsView'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import TournamentEditor from './pages/admin/TournamentEditor'
import MatchController from './pages/admin/MatchController'
import ParticipantsManagement from './pages/admin/ParticipantsManagement'
import FixturesManagement from './pages/admin/FixturesManagement'

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/tournament/:id" element={<Layout><TournamentView /></Layout>} />
          <Route path="/tournament/:id/matches" element={<Layout><MatchList /></Layout>} />
          <Route path="/tournament/:id/bracket" element={<Layout><BracketView /></Layout>} />
          <Route path="/tournament/:id/standings" element={<Layout><StandingsView /></Layout>} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <TournamentEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* More specific routes must come before the general :id route */}
          <Route
            path="/admin/tournaments/:id/participants"
            element={
              <ProtectedRoute>
                <Layout>
                  <ParticipantsManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/:id/fixtures"
            element={
              <ProtectedRoute>
                <Layout>
                  <FixturesManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/:id/matches"
            element={
              <ProtectedRoute>
                <Layout>
                  <MatchController />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TournamentEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

