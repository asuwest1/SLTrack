import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';

const PIE_COLORS = ['#0078d4', '#ffb900'];
const BAR_COLORS = ['#0078d4'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="error-message">Failed to load dashboard data.</div>;

  const pieData = data.licensingOverview.map(item => ({
    name: item.LicenseType,
    value: item.totalQuantity || item.count
  }));

  const barData = data.costByDepartment.map(item => ({
    name: item.CostCenter,
    'Cost by Department': item.totalCost
  }));

  const formatCurrency = (val) => '$' + Number(val).toLocaleString();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Licensing Overview</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cost by Department</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="Cost by Department" fill={BAR_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="expiration-widget">
        <div className="exp-card">
          <div className="exp-label">30-Day Expirations</div>
          <div className="exp-value exp-30">{data.expirations30Days}</div>
        </div>
        <div className="exp-card">
          <div className="exp-label">60-Day Expirations</div>
          <div className="exp-value exp-60">{data.expirations60Days}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Upcoming Expirations</h3>
        </div>
        {data.upcomingExpirations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No upcoming expirations in the next 60 days.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Software Title</th>
                <th>Type</th>
                <th>Expiration Date</th>
                <th>PO Number</th>
                <th>Cost Center</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingExpirations.map((item, i) => (
                <tr key={i}>
                  <td>{item.softwareTitle}</td>
                  <td><span className={`badge badge-${item.type === 'Subscription' ? 'subscription' : 'perpetual'}`}>{item.type}</span></td>
                  <td>{item.expirationDate?.split('T')[0]}</td>
                  <td>{item.poNumber}</td>
                  <td>{item.costCenter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
