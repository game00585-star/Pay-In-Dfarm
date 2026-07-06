const LOG_KEY = 'dfarm_production_logs';

export const LOG_TYPES = Object.freeze({
  APPLICATION: 'APPLICATION',
  SYSTEM: 'SYSTEM',
  SECURITY: 'SECURITY',
  AI: 'AI',
  OCR: 'OCR',
  WORKFLOW: 'WORKFLOW'
});

function readLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch {
    return [];
  }
}

export class LoggingService {
  listLogs() {
    return readLogs();
  }

  write(type, level, message, context = {}) {
    const log = {
      logId: `prd-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      level,
      message,
      context,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(LOG_KEY, JSON.stringify([log, ...this.listLogs()].slice(0, 10000)));
    return log;
  }
}

export const loggingService = new LoggingService();
