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
import CustomTournamentCreator from './pages/admin/CustomTournamentCreator'
import CustomTournamentsViewAll from './pages/admin/CustomTournamentsViewAll'
import CustomTournamentManagePage from './pages/admin/CustomTournamentManagePage'
import CustomFixtureGenerator from './pages/admin/CustomFixtureGenerator'
import GroupTournamentWizard from './pages/admin/GroupTournamentWizard'
import CustomTournamentMatches from './pages/admin/CustomTournamentMatches'
import CustomMatchManager from './pages/admin/CustomMatchManager'

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
            path="/admin/tournaments/custom/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentCreator />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/custom"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentCreator />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/custom/list"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentsViewAll />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/custom/view-all"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentsViewAll />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* More specific routes must come before the general :id route */}
          <Route
            path="/admin/tournaments/custom/:id/setup"
            element={
              <ProtectedRoute>
                <Layout>
                  <GroupTournamentWizard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/custom/:id/manage"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentManagePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/:id/fixtures"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomFixtureGenerator />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/custom/:id/matches"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentMatches />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tournaments/custom/:id/matches/manage"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomMatchManager />
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

