import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import TasksView from './components/TasksView.jsx';
import Login from './pages/Login.jsx';
import AIGenerator from './pages/AIGenerator.jsx';
import Dashboard from './pages/Dashboard.jsx';

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
        {isAdmin && <Route path="/ai" element={<AIGenerator />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}