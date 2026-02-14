const API_BASE = '/api';

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${url}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Titles
  getTitles: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/titles${qs ? '?' + qs : ''}`);
  },
  getTitle: (id) => request(`/titles/${id}`),
  createTitle: (data) => request('/titles', { method: 'POST', body: data }),
  updateTitle: (id, data) => request(`/titles/${id}`, { method: 'PUT', body: data }),

  // Licenses
  getLicenses: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/licenses${qs ? '?' + qs : ''}`);
  },
  getLicense: (id) => request(`/licenses/${id}`),
  createLicense: (data) => request('/licenses', { method: 'POST', body: data }),
  updateLicense: (id, data) => request(`/licenses/${id}`, { method: 'PUT', body: data }),
  deleteLicense: (id) => request(`/licenses/${id}`, { method: 'DELETE' }),

  // Support Contracts
  getSupportContracts: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/support-contracts${qs ? '?' + qs : ''}`);
  },
  createSupportContract: (data) => request('/support-contracts', { method: 'POST', body: data }),
  updateSupportContract: (id, data) => request(`/support-contracts/${id}`, { method: 'PUT', body: data }),
  deleteSupportContract: (id) => request(`/support-contracts/${id}`, { method: 'DELETE' }),

  // Manufacturers
  getManufacturers: () => request('/manufacturers'),
  createManufacturer: (data) => request('/manufacturers', { method: 'POST', body: data }),
  updateManufacturer: (id, data) => request(`/manufacturers/${id}`, { method: 'PUT', body: data }),
  deleteManufacturer: (id) => request(`/manufacturers/${id}`, { method: 'DELETE' }),

  // Resellers
  getResellers: () => request('/resellers'),
  createReseller: (data) => request('/resellers', { method: 'POST', body: data }),
  updateReseller: (id, data) => request(`/resellers/${id}`, { method: 'PUT', body: data }),
  deleteReseller: (id) => request(`/resellers/${id}`, { method: 'DELETE' }),

  // Attachments
  getAttachments: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/attachments${qs ? '?' + qs : ''}`);
  },
  uploadAttachment: (formData) => request('/attachments', { method: 'POST', body: formData }),
  deleteAttachment: (id) => request(`/attachments/${id}`, { method: 'DELETE' }),

  // Users
  getCurrentUser: () => request('/users/current'),
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),

  // Cost Centers & Currencies
  getCostCenters: () => request('/cost-centers'),
  getCurrencies: () => request('/currencies'),

  // Reports
  getExpirationReport: (days) => request(`/reports/expirations?days=${days || 60}`),
  getInventoryReport: () => request('/reports/inventory'),
  getSpendReport: () => request('/reports/spend-by-cost-center'),
};
