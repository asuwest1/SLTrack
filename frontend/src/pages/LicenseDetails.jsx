import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function LicenseDetails() {
  const { id } = useParams();
  const [title, setTitle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [editLicense, setEditLicense] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const { canEdit } = useAuth();
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const fetchData = () => {
    api.getTitle(id)
      .then(data => {
        setTitle(data);
        setAttachments(data.attachments || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('titleId', id);
    await api.uploadAttachment(formData);
    fetchData();
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return;
    await api.deleteAttachment(attachmentId);
    fetchData();
  };

  const handleSaveLicense = async (formData) => {
    if (editLicense) {
      await api.updateLicense(editLicense.LicenseID, formData);
    } else {
      await api.createLicense({ ...formData, TitleID: parseInt(id) });
    }
    setShowLicenseModal(false);
    setEditLicense(null);
    fetchData();
  };

  const handleSaveContract = async (formData) => {
    await api.createSupportContract(formData);
    setShowContractModal(false);
    fetchData();
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!title) return <div className="error-message">Title not found.</div>;

  const formatCurrency = (val, code) => {
    if (val == null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code || 'USD' }).format(val);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title.TitleName} - Details</h1>
          <p className="page-subtitle">{title.ManufacturerName || 'Unknown Vendor'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/software-inventory')}>Back to Inventory</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
        <div>
          <div className="tabs">
            {['overview', 'history', 'contracts', 'attachments'].map(tab => (
              <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'overview' ? 'Overview' : tab === 'history' ? 'License History' : tab === 'contracts' ? 'Support Contracts' : 'Attachments'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="card">
              <div className="grid-2">
                <div><strong>Manufacturer:</strong> {title.ManufacturerName || '-'}</div>
                <div><strong>Reseller:</strong> {title.ResellerName || '-'}</div>
                <div><strong>Category:</strong> {title.Category || '-'}</div>
                <div><strong>Status:</strong> <span className={`badge ${title.IsDecommissioned ? 'badge-decommissioned' : 'badge-active'}`}>{title.IsDecommissioned ? 'Decommissioned' : 'Active'}</span></div>
                <div><strong>Total License Records:</strong> {title.licenses?.length || 0}</div>
                <div><strong>Total Quantity:</strong> {title.licenses?.reduce((sum, l) => sum + (l.Quantity || 0), 0)}</div>
              </div>
              {title.Notes && <div style={{ marginTop: 16 }}><strong>Notes:</strong><p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{title.Notes}</p></div>}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3>License History</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => { setEditLicense(null); setShowLicenseModal(true); }}>Add License</button>}
              </div>
              <div className="timeline">
                {(title.licenses || []).map((lic, i) => (
                  <div className="timeline-item" key={lic.LicenseID}>
                    <div className="timeline-card">
                      <h4>{i === 0 ? 'Initial Purchase' : 'True-Up Purchase'}</h4>
                      <div className="detail">Date: {lic.PurchaseDate?.split('T')[0] || '-'}</div>
                      <div className="detail">PO: {lic.PONumber}</div>
                      <div className="detail">Quantity: {lic.Quantity}</div>
                      <div className="detail">Cost Center: {lic.CostCenter || '-'}</div>
                      <div className="detail">Cost: {formatCurrency(lic.Cost, lic.CurrencyCode)}</div>
                      <div className="detail">Type: <span className={`badge badge-${lic.LicenseType?.toLowerCase()}`}>{lic.LicenseType}</span></div>
                      {lic.ExpirationDate && <div className="detail">Expires: {lic.ExpirationDate.split('T')[0]}</div>}
                      {canEdit && (
                        <div style={{ marginTop: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditLicense(lic); setShowLicenseModal(true); }}>Edit</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!title.licenses || title.licenses.length === 0) && <p style={{ color: 'var(--text-muted)' }}>No license records found.</p>}
              </div>

              {title.licenses?.some(l => l.AssetMapping) && (
                <div className="assignments-box" style={{ marginTop: 16 }}>
                  <h4>Current Assignments</h4>
                  <pre>{title.licenses.filter(l => l.AssetMapping).map(l => l.AssetMapping).join('\n')}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3>Support Contracts</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowContractModal(true)}>Add Contract</button>}
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>License PO</th>
                    <th>Support PO</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(title.licenses || []).filter(l => l.SupportID).map(l => (
                    <tr key={l.SupportID}>
                      <td>{l.PONumber}</td>
                      <td>{l.SupportPONumber}</td>
                      <td>-</td>
                      <td>{l.SupportEndDate?.split('T')[0] || '-'}</td>
                      <td>-</td>
                      <td>
                        {l.SupportEndDate && new Date(l.SupportEndDate) < new Date()
                          ? <span className="badge badge-expired">Expired</span>
                          : <span className="badge badge-active">Active</span>}
                      </td>
                    </tr>
                  ))}
                  {!(title.licenses || []).some(l => l.SupportID) && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No support contracts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3>Attachments</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>Upload New File</button>}
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
              </div>
              <div className="attachment-list">
                {attachments.map(a => (
                  <div className="attachment-item" key={a.AttachmentID}>
                    <div className="attachment-name">
                      <span>{a.OriginalName}</span>
                    </div>
                    <div className="attachment-actions">
                      <a href={`/api/attachments/${a.AttachmentID}/download`} className="btn btn-primary btn-sm">Download</a>
                      {canEdit && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAttachment(a.AttachmentID)}>Delete</button>}
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No attachments.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Attachments summary */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Attachments</h3>
            </div>
            {canEdit && <button className="btn btn-primary btn-sm" style={{ marginBottom: 12 }} onClick={() => fileInputRef.current?.click()}>Upload New File</button>}
            <div className="attachment-list">
              {attachments.map(a => (
                <div className="attachment-item" key={a.AttachmentID}>
                  <div className="attachment-name"><span>{a.OriginalName}</span></div>
                  <div className="attachment-actions">
                    <a href={`/api/attachments/${a.AttachmentID}/download`} className="btn btn-primary btn-sm">Download</a>
                    {canEdit && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAttachment(a.AttachmentID)}>Delete</button>}
                  </div>
                </div>
              ))}
              {attachments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No files attached.</p>}
            </div>
          </div>
        </div>
      </div>

      {showLicenseModal && (
        <LicenseFormModal
          license={editLicense}
          titleId={id}
          onSave={handleSaveLicense}
          onClose={() => { setShowLicenseModal(false); setEditLicense(null); }}
        />
      )}

      {showContractModal && (
        <ContractFormModal
          licenses={(title.licenses || []).filter(l => !l.SupportID)}
          onSave={handleSaveContract}
          onClose={() => setShowContractModal(false)}
        />
      )}
    </div>
  );
}

function LicenseFormModal({ license, titleId, onSave, onClose }) {
  const [form, setForm] = useState({
    PONumber: license?.PONumber || '',
    LicenseType: license?.LicenseType || 'Subscription',
    Quantity: license?.Quantity || 1,
    CurrencyCode: license?.CurrencyCode || 'USD',
    Cost: license?.Cost || '',
    CostCenter: license?.CostCenter || '',
    LicenseKey: license?.LicenseKey || '',
    PurchaseDate: license?.PurchaseDate?.split('T')[0] || '',
    ExpirationDate: license?.ExpirationDate?.split('T')[0] || '',
    AssetMapping: license?.AssetMapping || '',
    Notes: license?.Notes || '',
  });
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCostCenters().then(setCostCenters);
    api.getCurrencies().then(setCurrencies);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.PONumber.trim()) { setError('PO Number is required'); return; }
    try {
      await onSave(form);
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={license ? 'Edit License' : 'Add New License'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
      </>}>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">PO Number <span className="required">*</span></label>
            <input className="form-input" value={form.PONumber} onChange={e => setForm({ ...form, PONumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">License Type <span className="required">*</span></label>
            <select className="form-select" value={form.LicenseType} onChange={e => setForm({ ...form, LicenseType: e.target.value })}>
              <option value="Subscription">Subscription</option>
              <option value="Perpetual">Perpetual</option>
            </select>
          </div>
        </div>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input className="form-input" type="number" min="1" value={form.Quantity} onChange={e => setForm({ ...form, Quantity: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-select" value={form.CurrencyCode} onChange={e => setForm({ ...form, CurrencyCode: e.target.value })}>
              {currencies.map(c => <option key={c.CurrencyCode} value={c.CurrencyCode}>{c.CurrencyCode} - {c.CurrencyName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cost</label>
            <input className="form-input" type="number" step="0.01" value={form.Cost} onChange={e => setForm({ ...form, Cost: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Cost Center</label>
            <select className="form-select" value={form.CostCenter} onChange={e => setForm({ ...form, CostCenter: e.target.value })}>
              <option value="">-- Select --</option>
              {costCenters.map(c => <option key={c.CostCenterID} value={c.Name}>{c.Name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Purchase Date</label>
            <input className="form-input" type="date" value={form.PurchaseDate} onChange={e => setForm({ ...form, PurchaseDate: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Expiration Date</label>
          <input className="form-input" type="date" value={form.ExpirationDate} onChange={e => setForm({ ...form, ExpirationDate: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">License Key</label>
          <textarea className="form-textarea" value={form.LicenseKey} onChange={e => setForm({ ...form, LicenseKey: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Asset Mapping (servers, workstations, users)</label>
          <textarea className="form-textarea" value={form.AssetMapping} onChange={e => setForm({ ...form, AssetMapping: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}

function ContractFormModal({ licenses, onSave, onClose }) {
  const [form, setForm] = useState({
    LicenseID: '',
    PONumber: '',
    VendorName: '',
    StartDate: '',
    EndDate: '',
    Cost: '',
    CurrencyCode: 'USD',
    CostCenter: '',
  });
  const [costCenters, setCostCenters] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { api.getCostCenters().then(setCostCenters); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.LicenseID) { setError('Select a license'); return; }
    if (!form.PONumber.trim()) { setError('PO Number is required'); return; }
    if (!form.EndDate) { setError('End Date is required'); return; }
    try {
      await onSave({ ...form, LicenseID: parseInt(form.LicenseID) });
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title="Add Support Contract" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
      </>}>
      {error && <div className="error-message">{error}</div>}
      {licenses.length === 0 ? (
        <p>All licenses already have support contracts.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">License <span className="required">*</span></label>
            <select className="form-select" value={form.LicenseID} onChange={e => setForm({ ...form, LicenseID: e.target.value })}>
              <option value="">-- Select License --</option>
              {licenses.map(l => <option key={l.LicenseID} value={l.LicenseID}>{l.PONumber} - {l.LicenseType} ({l.Quantity} seats)</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">PO Number <span className="required">*</span></label>
              <input className="form-input" value={form.PONumber} onChange={e => setForm({ ...form, PONumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <input className="form-input" value={form.VendorName} onChange={e => setForm({ ...form, VendorName: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.StartDate} onChange={e => setForm({ ...form, StartDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date <span className="required">*</span></label>
              <input className="form-input" type="date" value={form.EndDate} onChange={e => setForm({ ...form, EndDate: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Cost</label>
              <input className="form-input" type="number" step="0.01" value={form.Cost} onChange={e => setForm({ ...form, Cost: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Center</label>
              <select className="form-select" value={form.CostCenter} onChange={e => setForm({ ...form, CostCenter: e.target.value })}>
                <option value="">-- Select --</option>
                {costCenters.map(c => <option key={c.CostCenterID} value={c.Name}>{c.Name}</option>)}
              </select>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
