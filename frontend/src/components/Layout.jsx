import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/software-inventory', label: 'Software Inventory', icon: '☰' },
  { path: '/vendors', label: 'Vendors', icon: '⊟' },
  { path: '/reports', label: 'Reports', icon: '⊡' },
];

const adminItems = [
  { path: '/admin-settings', label: 'Admin Settings', icon: '⚙' },
];

export default function Layout() {
  const { user, canViewSettings } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">SL</span>
          <span className="header-title">Software License Management System</span>
        </div>
        {user && (
          <div className="header-user">
            <span className="user-avatar">{user.DisplayName.charAt(0)}</span>
            <span className="user-info">
              {user.DisplayName} ({user.Role === 'SystemAdmin' ? 'System Admin' : user.Role === 'SoftwareAdmin' ? 'Software Admin' : 'License Viewer'})
            </span>
          </div>
        )}
      </header>
      <div className="app-body">
        <nav className="sidebar">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
          {canViewSettings && adminItems.map(item => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
