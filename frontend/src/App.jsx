import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SoftwareInventory from './pages/SoftwareInventory';
import LicenseDetails from './pages/LicenseDetails';
import Vendors from './pages/Vendors';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/software-inventory" element={<SoftwareInventory />} />
            <Route path="/license-details/:id" element={<LicenseDetails />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin-settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
