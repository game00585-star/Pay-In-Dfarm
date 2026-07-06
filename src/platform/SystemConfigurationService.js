const CONFIG_KEY = 'dfarm_platform_configuration';

const DEFAULT_CONFIGURATION = {
  aiProvider: 'MOCK',
  ocrProvider: 'MOCK',
  preprocessingProvider: 'MOCK',
  queueRetryLimit: 3,
  queueTimeoutMs: 120000,
  storageProvider: 'LOCAL',
  riskThreshold: 70,
  notificationChannels: ['IN_APP'],
  sessionTimeoutMinutes: 60,
  retentionDays: 365,
  backupSchedule: {
    daily: true,
    weekly: true,
    monthly: true
  }
};

function readConfig() {
  try {
    return { ...DEFAULT_CONFIGURATION, ...(JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}) };
  } catch {
    return DEFAULT_CONFIGURATION;
  }
}

export class SystemConfigurationService {
  constructor({ storage = localStorage } = {}) {
    this.storage = storage;
  }

  getConfiguration() {
    try {
      return { ...DEFAULT_CONFIGURATION, ...(JSON.parse(this.storage.getItem(CONFIG_KEY)) || {}) };
    } catch {
      return DEFAULT_CONFIGURATION;
    }
  }

  updateConfiguration(patch = {}) {
    const next = { ...this.getConfiguration(), ...patch, updatedAt: new Date().toISOString() };
    this.storage.setItem(CONFIG_KEY, JSON.stringify(next));
    return next;
  }
}

export const systemConfigurationService = new SystemConfigurationService();
export { DEFAULT_CONFIGURATION, readConfig };
