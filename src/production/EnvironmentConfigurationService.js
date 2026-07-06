const ENV_CONFIG_KEY = 'dfarm_production_environment_config';

export const ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: 'DEVELOPMENT',
  TESTING: 'TESTING',
  UAT: 'UAT',
  PRODUCTION: 'PRODUCTION'
});

const DEFAULT_ENVIRONMENT_CONFIG = {
  activeEnvironment: ENVIRONMENTS.DEVELOPMENT,
  environments: {
    DEVELOPMENT: { apiBaseUrl: 'http://localhost:5173', databaseMode: 'MOCK', storageMode: 'LOCAL', trainingMode: true },
    TESTING: { apiBaseUrl: 'http://localhost:5173', databaseMode: 'MOCK', storageMode: 'LOCAL', trainingMode: true },
    UAT: { apiBaseUrl: 'http://uat.local', databaseMode: 'FIREBASE_UAT', storageMode: 'FIREBASE_UAT', trainingMode: true },
    PRODUCTION: { apiBaseUrl: 'https://payin.d-farm.local', databaseMode: 'FIREBASE_PROD', storageMode: 'FIREBASE_PROD', trainingMode: false }
  }
};

function readEnvironmentConfig() {
  try {
    return { ...DEFAULT_ENVIRONMENT_CONFIG, ...(JSON.parse(localStorage.getItem(ENV_CONFIG_KEY)) || {}) };
  } catch {
    return DEFAULT_ENVIRONMENT_CONFIG;
  }
}

export class EnvironmentConfigurationService {
  getConfig() {
    return readEnvironmentConfig();
  }

  setEnvironment(activeEnvironment) {
    const current = this.getConfig();
    const next = { ...current, activeEnvironment, updatedAt: new Date().toISOString() };
    localStorage.setItem(ENV_CONFIG_KEY, JSON.stringify(next));
    return next;
  }

  updateEnvironment(environment, patch = {}) {
    const current = this.getConfig();
    const next = {
      ...current,
      environments: {
        ...current.environments,
        [environment]: { ...(current.environments?.[environment] || {}), ...patch }
      },
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(ENV_CONFIG_KEY, JSON.stringify(next));
    return next;
  }
}

export const environmentConfigurationService = new EnvironmentConfigurationService();
