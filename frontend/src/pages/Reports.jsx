import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { exportToCSV } from '../utils/export';

export default function Reports() {
  const [reportType, setReportType] = useState('expirations');
  const [days, setDays] = useState(60);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'expirations') {
        setData(await api.getExpirationReport(days));
      } else if (reportType === 'inventory') {
        setData(await api.getInventoryReport());
      } else if (reportType === 'spend') {
        setData(await api.getSpendReport());
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [reportType, days]);

  const handleExport = () => {
    const filename = reportType === 'expirations'
      ? `Upcoming_Expirations_${days}days`
      : reportType === 'inventory' ? 'Full_Inventory' : 'Spend_By_CostCenter';
    exportToCSV(data, filename);
  };

  const formatCurrency = (val) => val != null ? '$' + Number(val).toLocaleString() : '-';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {reportType === 'expirations' && `Generated Report: Upcoming Expirations (Next ${days} Days)`}
            {reportType === 'inventory' && 'Generated Report: Full Software Inventory'}
            {reportType === 'spend' && 'Generated Report: Spend by Cost Center'}
          </h1>
        </div>
        <button className="btn btn-export" onClick={handleExport}>Export to Excel</button>
      </div>

      <div className="card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="expirations">Upcoming Expirations</option>
              <option value="inventory">Full Inventory</option>
              <option value="spend">Spend by Cost Center</option>
            </select>
          </div>
          {reportType === 'expirations' && (
            <div className="filter-group">
              <label>Time Range</label>
              <select value={days} onChange={e => setDays(parseInt(e.target.value))}>
                <option value={30}>Next 30 Days</option>
                <option value={60}>Next 60 Days</option>
                <option value={90}>Next 90 Days</option>
                <option value={180}>Next 180 Days</option>
                <option value={365}>Next 365 Days</option>
              </select>
            </div>
          )}
        </div>

        {loading ? <div className="loading">Loading report...</div> : (
          <>
            {reportType === 'expirations' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Software Title</th>
                    <th>Vendor</th>
                    <th>License Type</th>
                    <th>Expiration Date</th>
                    <th>Days Remaining</th>
                    <th>PO Number</th>
                    <th>Cost Center</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i}>
                      <td>{r.softwareTitle}</td>
                      <td>{r.vendor || '-'}</td>
                      <td><span className={`badge badge-${r.licenseType === 'Subscription' ? 'subscription' : r.licenseType === 'Perpetual' ? 'perpetual' : 'perpetual'}`}>{r.licenseType}</span></td>
                      <td>{r.expirationDate?.split('T')[0]}</td>
                      <td>
                        <span className={r.daysRemaining <= 14 ? 'badge badge-expired' : r.daysRemaining <= 30 ? 'badge badge-warning' : ''}>
                          {r.daysRemaining}
                        </span>
                      </td>
                      <td>{r.poNumber}</td>
                      <td>{r.costCenter}</td>
                    </tr>
                  ))}
                  {data.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expiring items in this time range.</td></tr>}
                </tbody>
              </table>
            )}

            {reportType === 'inventory' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title Name</th>
                    <th>Manufacturer</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>License Types</th>
                    <th>Total Qty</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} className={r.Status === 'Decommissioned' ? 'decommissioned' : ''}>
                      <td>{r.TitleName}</td>
                      <td>{r.Manufacturer || '-'}</td>
                      <td>{r.Category || '-'}</td>
                      <td><span className={`badge ${r.Status === 'Active' ? 'badge-active' : 'badge-decommissioned'}`}>{r.Status}</span></td>
                      <td>{r.LicenseTypes || '-'}</td>
                      <td>{r.TotalQuantity || 0}</td>
                      <td>{formatCurrency(r.TotalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'spend' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cost Center</th>
                    <th>Title Count</th>
                    <th>Total Licenses</th>
                    <th>License Cost</th>
                    <th>Support Cost</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i}>
                      <td>{r.CostCenter || '-'}</td>
                      <td>{r.TitleCount}</td>
                      <td>{r.TotalLicenses}</td>
                      <td>{formatCurrency(r.LicenseCost)}</td>
                      <td>{formatCurrency(r.SupportCost)}</td>
                      <td><strong>{formatCurrency(r.TotalCost)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
