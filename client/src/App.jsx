import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Files from './pages/Files.jsx';
import Layout from './components/Layout.jsx';
import TasksView from './components/TasksView.jsx';
import Login from './pages/Login.jsx';
import AIGenerator from './pages/AIGenerator.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Planner from './pages/Planner.jsx';
import Reports from './pages/Reports.jsx';
import Attendance from './pages/Attendance.jsx';
import EmailSettings from './pages/EmailSettings.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-mute">Loading…</p>;
  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
  const isAdmin = user.role === 'admin';
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard isAdmin={isAdmin} />} />
        <Route path="/tasks" element={<TasksView isAdmin={isAdmin} />} />
        <Route path="/planner" element={<Planner isAdmin={isAdmin} />} />
        <Route path="/attendance" element={<Attendance isAdmin={isAdmin} />} />
        <Route path="/files" element={<Files />} />
        {isAdmin && <Route path="/reports" element={<Reports />} />}
        {isAdmin && <Route path="/email" element={<EmailSettings />} />}
        {isAdmin && <Route path="/ai" element={<AIGenerator />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}