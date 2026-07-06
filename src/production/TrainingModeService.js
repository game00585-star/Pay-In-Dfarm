const TRAINING_MODE_KEY = 'dfarm_training_mode';

export class TrainingModeService {
  getState() {
    try {
      return JSON.parse(localStorage.getItem(TRAINING_MODE_KEY)) || { enabled: false, roles: ['BRANCH', 'ACCOUNTING', 'AUDIT'], dataMode: 'DEMO_ONLY' };
    } catch {
      return { enabled: false, roles: ['BRANCH', 'ACCOUNTING', 'AUDIT'], dataMode: 'DEMO_ONLY' };
    }
  }

  setEnabled(enabled) {
    const next = { ...this.getState(), enabled, updatedAt: new Date().toISOString() };
    localStorage.setItem(TRAINING_MODE_KEY, JSON.stringify(next));
    return next;
  }
}

export const trainingModeService = new TrainingModeService();
