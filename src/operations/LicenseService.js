const LICENSE_KEY = 'dfarm_operations_license';

const DEFAULT_LICENSE = {
  licenseType: 'ENTERPRISE',
  product: 'D-FARM Pay-in AI',
  version: '1.0.0',
  maxBranches: 500,
  maxUsers: 1000,
  maxDocuments: 10000000,
  status: 'ACTIVE',
  validUntil: '2030-12-31',
  futureExpansion: ['POS API', 'ERP', 'SAP', 'Microsoft Dynamics', 'Power BI', 'Microsoft 365']
};

export class LicenseService {
  getLicense() {
    try {
      return { ...DEFAULT_LICENSE, ...(JSON.parse(localStorage.getItem(LICENSE_KEY)) || {}) };
    } catch {
      return DEFAULT_LICENSE;
    }
  }

  update(patch = {}) {
    const next = { ...this.getLicense(), ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(LICENSE_KEY, JSON.stringify(next));
    return next;
  }
}

export const licenseService = new LicenseService();
