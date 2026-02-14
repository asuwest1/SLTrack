import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SoftwareInventory from './pages/SoftwareInventory';
import LicenseDetails from './pages/LicenseDetails';
import Vendors from './pages/Vendors';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';

function RequireAuth({ children }) {
  const { user, loading, authError } = useAuth();
  if (loading) return <div className="loading">Authenticating...</div>;
  if (authError || !user) return <div className="error-message" style={{ margin: 40 }}>Authentication failed. Please contact your system administrator.</div>;
  return children;
}

function RequireAdmin({ children }) {
  const { canViewSettings } = useAuth();
  if (!canViewSettings) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/software-inventory" element={<SoftwareInventory />} />
            <Route path="/license-details/:id" element={<LicenseDetails />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin-settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
