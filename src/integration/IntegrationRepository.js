const JOBS_KEY = 'dfarm_integration_jobs';
const LOGS_KEY = 'dfarm_integration_logs';
const CONNECTORS_KEY = 'dfarm_integration_connectors';
const API_KEYS_KEY = 'dfarm_integration_api_keys';
const DEAD_LETTER_KEY = 'dfarm_integration_dead_letters';

function read(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class IntegrationRepository {
  listJobs() {
    return read(JOBS_KEY);
  }

  saveJob(job) {
    const next = this.listJobs().some((item) => item.jobId === job.jobId)
      ? this.listJobs().map((item) => (item.jobId === job.jobId ? job : item))
      : [job, ...this.listJobs()];
    write(JOBS_KEY, next);
    return job;
  }

  listLogs() {
    return read(LOGS_KEY);
  }

  saveLog(log) {
    write(LOGS_KEY, [log, ...this.listLogs()].slice(0, 10000));
    return log;
  }

  listConnectors() {
    return read(CONNECTORS_KEY, []);
  }

  saveConnectors(connectors) {
    write(CONNECTORS_KEY, connectors);
    return connectors;
  }

  listApiKeys() {
    return read(API_KEYS_KEY);
  }

  saveApiKeys(keys) {
    write(API_KEYS_KEY, keys);
    return keys;
  }

  listDeadLetters() {
    return read(DEAD_LETTER_KEY);
  }

  saveDeadLetter(job) {
    write(DEAD_LETTER_KEY, [job, ...this.listDeadLetters()].slice(0, 10000));
    return job;
  }
}

export const integrationRepository = new IntegrationRepository();
