import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Components
import PrivateRoute from './components/PrivateRoute';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';

// Core Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SystemTest from './pages/SystemTest';

// Interview Pages
import InterviewSetup from './pages/InterviewSetup';
import InterviewLive from './pages/InterviewLive';
import InterviewPaused from './pages/InterviewPaused';

// Analysis Pages
import AnalysisLive from './pages/AnalysisLive';
import AnalysisPlayback from './pages/AnalysisPlayback';

// Reports Pages
import ReportsList from './pages/ReportsList';
import ReportView from './pages/ReportView';
import ResumeParserTest from './pages/ResumeParserTest';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminSessions from './pages/AdminSessions';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes - Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Main Routes - Protected */}
        <Route 
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/system-test" element={<SystemTest />} />

          {/* Interview Routes */}
          <Route path="/interview-setup" element={<InterviewSetup />} />
          <Route path="/interview-live" element={<InterviewLive />} />
          <Route path="/interview-paused" element={<InterviewPaused />} />

          {/* Analysis Routes */}
          <Route path="/analysis-live" element={<AnalysisLive />} />
          <Route path="/analysis-playback" element={<AnalysisPlayback />} />

          {/* Reports Routes */}
          <Route path="/reports" element={<ReportsList />} />
          <Route path="/report-view/:id" element={<ReportView />} />
          <Route path="/resume-parser-test" element={<ResumeParserTest />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/admin-sessions" element={<AdminSessions />} />
        </Route>

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}