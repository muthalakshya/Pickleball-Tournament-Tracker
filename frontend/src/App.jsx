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
import CustomTournamentCreator from './pages/admin/CustomTournamentCreator'
import CustomTournamentsList from './pages/admin/CustomTournamentsList'
import CustomTournamentsViewAll from './pages/admin/CustomTournamentsViewAll'
import CustomTournamentManage from './pages/admin/CustomTournamentManage'
import CustomTournamentManagePage from './pages/admin/CustomTournamentManagePage'
import CustomFixtureGenerator from './pages/admin/CustomFixtureGenerator'
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
            path="/admin/tournaments/:id/manage"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomTournamentManage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route // New dedicated route for managing custom tournaments
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

