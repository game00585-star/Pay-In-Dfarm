const MAINTENANCE_KEY = 'dfarm_operations_maintenance';

const DEFAULT_MAINTENANCE = {
  maintenanceMode: false,
  readOnlyMode: false,
  emergencyMode: false,
  message: '',
  updatedAt: ''
};

export class MaintenanceService {
  getState() {
    try {
      return { ...DEFAULT_MAINTENANCE, ...(JSON.parse(localStorage.getItem(MAINTENANCE_KEY)) || {}) };
    } catch {
      return DEFAULT_MAINTENANCE;
    }
  }

  update(patch = {}) {
    const next = { ...this.getState(), ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(next));
    return next;
  }
}

export const maintenanceService = new MaintenanceService();
