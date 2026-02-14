import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Vendors() {
  const [manufacturers, setManufacturers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [activeTab, setActiveTab] = useState('manufacturers');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalType, setModalType] = useState('manufacturer');
  const { canEdit } = useAuth();

  const fetchData = () => {
    api.getManufacturers().then(setManufacturers);
    api.getResellers().then(setResellers);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = (type) => {
    setModalType(type);
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (type, item) => {
    setModalType(type);
    setEditItem(item);
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    if (modalType === 'manufacturer') {
      if (editItem) await api.updateManufacturer(editItem.ManufacturerID, formData);
      else await api.createManufacturer(formData);
    } else {
      if (editItem) await api.updateReseller(editItem.ResellerID, formData);
      else await api.createReseller(formData);
    }
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Delete this vendor?')) return;
    try {
      if (type === 'manufacturer') await api.deleteManufacturer(id);
      else await api.deleteReseller(id);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Manufacturers & Resellers</p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => openAdd(activeTab === 'manufacturers' ? 'manufacturer' : 'reseller')}>
              Add {activeTab === 'manufacturers' ? 'Manufacturer' : 'Reseller'}
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'manufacturers' ? 'active' : ''}`} onClick={() => setActiveTab('manufacturers')}>Manufacturers</button>
        <button className={`tab ${activeTab === 'resellers' ? 'active' : ''}`} onClick={() => setActiveTab('resellers')}>Resellers</button>
      </div>

      {activeTab === 'manufacturers' && (
        <div className="vendor-grid">
          {manufacturers.map(m => (
            <div className="card vendor-card" key={m.ManufacturerID}>
              <div className="vendor-title">{m.Name}</div>
              <div className="vendor-detail">Website: {m.Website || '-'}</div>
              <div className="vendor-detail">Email: {m.ContactEmail || '-'}</div>
              <div className="vendor-detail">Software Titles: {m.TitleCount}</div>
              {canEdit && (
                <div className="vendor-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit('manufacturer', m)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete('manufacturer', m.ManufacturerID)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'resellers' && (
        <div className="vendor-grid">
          {resellers.map(r => (
            <div className="card vendor-card" key={r.ResellerID}>
              <div className="vendor-title">{r.Name}</div>
              <div className="vendor-detail">Contact: {r.ContactName || '-'}</div>
              <div className="vendor-detail">Email: {r.ContactEmail || '-'}</div>
              <div className="vendor-detail">Phone: {r.Phone || '-'}</div>
              <div className="vendor-detail">Software Titles: {r.TitleCount}</div>
              {canEdit && (
                <div className="vendor-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit('reseller', r)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete('reseller', r.ResellerID)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <VendorFormModal type={modalType} item={editItem} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function VendorFormModal({ type, item, onSave, onClose }) {
  const isManufacturer = type === 'manufacturer';
  const [form, setForm] = useState(
    isManufacturer
      ? { Name: item?.Name || '', Website: item?.Website || '', ContactEmail: item?.ContactEmail || '' }
      : { Name: item?.Name || '', ContactName: item?.ContactName || '', ContactEmail: item?.ContactEmail || '', Phone: item?.Phone || '' }
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Name.trim()) { setError('Name is required'); return; }
    try { await onSave(form); } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={`${item ? 'Edit' : 'Add'} ${isManufacturer ? 'Manufacturer' : 'Reseller'}`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
      </>}>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name <span className="required">*</span></label>
          <input className="form-input" value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} />
        </div>
        {isManufacturer ? (
          <>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.Website} onChange={e => setForm({ ...form, Website: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input className="form-input" type="email" value={form.ContactEmail} onChange={e => setForm({ ...form, ContactEmail: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input className="form-input" value={form.ContactName} onChange={e => setForm({ ...form, ContactName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input className="form-input" type="email" value={form.ContactEmail} onChange={e => setForm({ ...form, ContactEmail: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.Phone} onChange={e => setForm({ ...form, Phone: e.target.value })} />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
