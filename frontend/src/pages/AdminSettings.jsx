import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [users, setUsers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { canViewSettings } = useAuth();

  const fetchData = () => {
    Promise.all([
      api.getSettings(),
      api.getUsers(),
      api.getCostCenters(),
      api.getCurrencies()
    ]).then(([s, u, cc, cur]) => {
      setSettings(s);
      setUsers(u);
      setCostCenters(cc);
      setCurrencies(cur);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const getSetting = (key) => settings.find(s => s.SettingKey === key)?.SettingValue || '';

  const updateSetting = (key, value) => {
    setSettings(settings.map(s => s.SettingKey === key ? { ...s, SettingValue: value } : s));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.updateSettings(settings.map(s => ({ SettingKey: s.SettingKey, SettingValue: s.SettingValue })));
      setMessage('Settings saved successfully.');
    } catch (err) { setMessage('Error: ' + err.message); }
    setSaving(false);
  };

  const handleSaveUser = async (formData) => {
    if (editUser) {
      await api.updateUser(editUser.UserID, formData);
    } else {
      await api.createUser(formData);
    }
    setShowUserModal(false);
    setEditUser(null);
    fetchData();
  };

  if (!canViewSettings) return <div className="error-message">Access denied. System Admin role required.</div>;
  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Settings</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
        <button className={`tab ${activeTab === 'smtp' ? 'active' : ''}`} onClick={() => setActiveTab('smtp')}>SMTP / Notifications</button>
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users & Roles</button>
        <button className={`tab ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>Reference Data</button>
      </div>

      {message && <div className={message.startsWith('Error') ? 'error-message' : 'card'} style={{ marginBottom: 16, padding: 12, background: message.startsWith('Error') ? undefined : '#dff6dd', color: message.startsWith('Error') ? undefined : '#107c10' }}>{message}</div>}

      {activeTab === 'general' && (
        <div className="card">
          <div className="settings-section">
            <h3>Application Settings</h3>
            <div className="form-group">
              <label className="form-label">Application Name</label>
              <input className="form-input" value={getSetting('app_name')} onChange={e => updateSetting('app_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">File Storage Path (UNC)</label>
              <input className="form-input" value={getSetting('file_storage_path')} onChange={e => updateSetting('file_storage_path', e.target.value)} placeholder="\\server\share\path" />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      )}

      {activeTab === 'smtp' && (
        <div className="card">
          <div className="settings-section">
            <h3>SMTP Configuration</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">SMTP Server</label>
                <input className="form-input" value={getSetting('smtp_server')} onChange={e => updateSetting('smtp_server', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Port</label>
                <input className="form-input" value={getSetting('smtp_port')} onChange={e => updateSetting('smtp_port', e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">From Address</label>
                <input className="form-input" value={getSetting('smtp_from')} onChange={e => updateSetting('smtp_from', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Use TLS</label>
                <select className="form-select" value={getSetting('smtp_use_tls')} onChange={e => updateSetting('smtp_use_tls', e.target.value)}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>
          <div className="settings-section">
            <h3>Alert Configuration</h3>
            <div className="form-group">
              <label className="form-label">Distribution List (Email)</label>
              <input className="form-input" value={getSetting('alert_distribution_list')} onChange={e => updateSetting('alert_distribution_list', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Alert Intervals (days before expiration, comma-separated)</label>
              <input className="form-input" value={getSetting('alert_intervals')} onChange={e => updateSetting('alert_intervals', e.target.value)} placeholder="45,28,14,7" />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">User Management</h3>
            <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowUserModal(true); }}>Add User</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.UserID}>
                  <td>{u.Username}</td>
                  <td>{u.DisplayName}</td>
                  <td>{u.Email || '-'}</td>
                  <td>
                    <span className="badge badge-perpetual">
                      {u.Role === 'SystemAdmin' ? 'System Admin' : u.Role === 'SoftwareAdmin' ? 'Software Admin' : 'License Viewer'}
                    </span>
                  </td>
                  <td><span className={`badge ${u.IsActive ? 'badge-active' : 'badge-decommissioned'}`}>{u.IsActive ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setShowUserModal(true); }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'data' && (
        <div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Cost Centers</h3></div>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Department</th></tr></thead>
              <tbody>
                {costCenters.map(c => <tr key={c.CostCenterID}><td>{c.Name}</td><td>{c.Department || '-'}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Currencies</h3></div>
            <table className="data-table">
              <thead><tr><th>Code</th><th>Name</th></tr></thead>
              <tbody>
                {currencies.map(c => <tr key={c.CurrencyCode}><td>{c.CurrencyCode}</td><td>{c.CurrencyName}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUserModal && (
        <UserFormModal user={editUser} onSave={handleSaveUser} onClose={() => { setShowUserModal(false); setEditUser(null); }} />
      )}
    </div>
  );
}

function UserFormModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    Username: user?.Username || '',
    DisplayName: user?.DisplayName || '',
    Email: user?.Email || '',
    Role: user?.Role || 'LicenseViewer',
    IsActive: user?.IsActive ?? 1,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Username.trim() || !form.DisplayName.trim()) { setError('Username and Display Name are required'); return; }
    try { await onSave(form); } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={user ? 'Edit User' : 'Add User'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
      </>}>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input className="form-input" value={form.Username} onChange={e => setForm({ ...form, Username: e.target.value })} disabled={!!user} />
          </div>
          <div className="form-group">
            <label className="form-label">Display Name <span className="required">*</span></label>
            <input className="form-input" value={form.DisplayName} onChange={e => setForm({ ...form, DisplayName: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Role <span className="required">*</span></label>
            <select className="form-select" value={form.Role} onChange={e => setForm({ ...form, Role: e.target.value })}>
              <option value="SystemAdmin">System Admin</option>
              <option value="SoftwareAdmin">Software Admin</option>
              <option value="LicenseViewer">License Viewer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.IsActive} onChange={e => setForm({ ...form, IsActive: parseInt(e.target.value) })}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
