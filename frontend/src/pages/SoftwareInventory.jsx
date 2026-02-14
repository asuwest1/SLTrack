import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function SoftwareInventory() {
  const [titles, setTitles] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState('all');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTitle, setEditTitle] = useState(null);
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Debounce search input to avoid API flooding
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchTitles = () => {
    const params = {};
    if (vendor !== 'all') params.vendor = vendor;
    if (status) params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;
    api.getTitles(params).then(setTitles).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.getManufacturers().then(setManufacturers).catch(() => {});
    api.getResellers().then(setResellers).catch(() => {});
  }, []);

  useEffect(() => { fetchTitles(); }, [vendor, status, debouncedSearch]);

  const handleExport = () => {
    const data = titles.map(t => ({
      'Title Name': t.TitleName,
      'Vendor': t.ManufacturerName || '',
      'License Type': t.LicenseTypes || '',
      'Status': t.IsDecommissioned ? 'Decommissioned' : 'Active',
      'Total Licenses': t.TotalLicenses || 0
    }));
    exportToCSV(data, 'Software_Inventory');
  };

  const handleSave = async (formData) => {
    if (editTitle) {
      await api.updateTitle(editTitle.TitleID, formData);
    } else {
      await api.createTitle(formData);
    }
    setShowModal(false);
    setEditTitle(null);
    fetchTitles();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Software Inventory</h1>
          <p className="page-subtitle">All Software Titles</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-export" onClick={handleExport}>Export to Excel</button>
          {canEdit && <button className="btn btn-primary" onClick={() => { setEditTitle(null); setShowModal(true); }}>Add New Title</button>}
        </div>
      </div>

      <div className="card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Vendor</label>
            <select value={vendor} onChange={e => setVendor(e.target.value)}>
              <option value="all">All Vendor</option>
              {manufacturers.map(m => (
                <option key={m.ManufacturerID} value={m.ManufacturerID}>{m.Name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>
          <div className="filter-group" style={{ marginLeft: 'auto' }}>
            <label>&nbsp;</label>
            <input type="text" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading">Loading...</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title Name</th>
                <th>Vendor</th>
                <th>License Type</th>
                <th>Status</th>
                <th>Total Licenses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {titles.map(t => (
                <tr key={t.TitleID} className={t.IsDecommissioned ? 'decommissioned' : ''}>
                  <td>{t.TitleName}</td>
                  <td>{t.ManufacturerName || '-'}</td>
                  <td>{t.LicenseTypes || '-'}</td>
                  <td>
                    <span className={`badge ${t.IsDecommissioned ? 'badge-decommissioned' : 'badge-active'}`}>
                      {t.IsDecommissioned ? 'Decommissioned' : 'Active'}
                    </span>
                  </td>
                  <td>{t.TotalLicenses || 0}</td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/license-details/${t.TitleID}`)}>View Details</button>
                    {canEdit && (
                      <button className="btn btn-secondary btn-sm" style={{ marginLeft: 4 }} onClick={() => { setEditTitle(t); setShowModal(true); }}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
              {titles.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No software titles found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <TitleFormModal
          title={editTitle}
          manufacturers={manufacturers}
          resellers={resellers}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTitle(null); }}
        />
      )}
    </div>
  );
}

function TitleFormModal({ title, manufacturers, resellers, onSave, onClose }) {
  const [form, setForm] = useState({
    TitleName: title?.TitleName || '',
    ManufacturerID: title?.ManufacturerID || '',
    ResellerID: title?.ResellerID || '',
    Category: title?.Category || '',
    Notes: title?.Notes || '',
    IsDecommissioned: title?.IsDecommissioned || 0,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.TitleName.trim()) { setError('Title Name is required'); return; }
    try {
      await onSave({ ...form, ManufacturerID: form.ManufacturerID || null, ResellerID: form.ResellerID || null });
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={title ? 'Edit Software Title' : 'Add New Software Title'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
      </>}>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Title Name <span className="required">*</span></label>
          <input className="form-input" value={form.TitleName} onChange={e => setForm({ ...form, TitleName: e.target.value })} />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Manufacturer</label>
            <select className="form-select" value={form.ManufacturerID} onChange={e => setForm({ ...form, ManufacturerID: e.target.value })}>
              <option value="">-- Select --</option>
              {manufacturers.map(m => <option key={m.ManufacturerID} value={m.ManufacturerID}>{m.Name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reseller</label>
            <select className="form-select" value={form.ResellerID} onChange={e => setForm({ ...form, ResellerID: e.target.value })}>
              <option value="">-- Select --</option>
              {resellers.map(r => <option key={r.ResellerID} value={r.ResellerID}>{r.Name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" value={form.Category} onChange={e => setForm({ ...form, Category: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.IsDecommissioned} onChange={e => setForm({ ...form, IsDecommissioned: parseInt(e.target.value) })}>
              <option value={0}>Active</option>
              <option value={1}>Decommissioned</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
