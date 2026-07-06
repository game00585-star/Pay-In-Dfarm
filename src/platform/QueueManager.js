import { readConfig } from './SystemConfigurationService.js';

const QUEUE_KEY = 'dfarm_platform_queues';
const DEAD_LETTER_KEY = 'dfarm_platform_dead_letter_queue';

export const QUEUE_TYPES = Object.freeze({
  AI_OCR: 'AI_OCR',
  VALIDATION: 'VALIDATION',
  RISK: 'RISK',
  NOTIFICATION: 'NOTIFICATION',
  EXPORT: 'EXPORT',
  REPORT: 'REPORT'
});

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class QueueManager {
  constructor({ configurationService = { getConfiguration: readConfig } } = {}) {
    this.configurationService = configurationService;
  }

  listJobs() {
    return read(QUEUE_KEY, []);
  }

  enqueue(type, payload = {}, options = {}) {
    const config = this.configurationService.getConfiguration();
    const job = {
      jobId: `job-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      payload,
      status: 'QUEUED',
      priority: options.priority || 'NORMAL',
      retryCount: 0,
      maxRetry: options.maxRetry ?? config.queueRetryLimit ?? 3,
      timeoutMs: options.timeoutMs ?? config.queueTimeoutMs ?? 120000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lockedBy: '',
      error: ''
    };
    write(QUEUE_KEY, [job, ...this.listJobs()]);
    return job;
  }

  updateJob(jobId, patch = {}) {
    const next = this.listJobs().map((job) => (job.jobId === jobId ? { ...job, ...patch, updatedAt: new Date().toISOString() } : job));
    write(QUEUE_KEY, next);
    return next.find((job) => job.jobId === jobId);
  }

  retry(jobId) {
    const job = this.listJobs().find((item) => item.jobId === jobId);
    if (!job) return null;
    if (job.retryCount + 1 > job.maxRetry) return this.moveToDeadLetter(job, 'Retry limit exceeded');
    return this.updateJob(jobId, { status: 'QUEUED', retryCount: job.retryCount + 1, error: '' });
  }

  pause(jobId) {
    return this.updateJob(jobId, { status: 'PAUSED' });
  }

  resume(jobId) {
    return this.updateJob(jobId, { status: 'QUEUED' });
  }

  complete(jobId) {
    return this.updateJob(jobId, { status: 'COMPLETED', completedAt: new Date().toISOString() });
  }

  fail(jobId, error = 'Unknown error') {
    const job = this.updateJob(jobId, { status: 'FAILED', error });
    if (job?.retryCount >= job?.maxRetry) return this.moveToDeadLetter(job, error);
    return job;
  }

  moveToDeadLetter(job, error) {
    const dead = { ...job, status: 'DEAD_LETTER', error, updatedAt: new Date().toISOString() };
    write(DEAD_LETTER_KEY, [dead, ...this.listDeadLetters()]);
    write(QUEUE_KEY, this.listJobs().filter((item) => item.jobId !== job.jobId));
    return dead;
  }

  listDeadLetters() {
    return read(DEAD_LETTER_KEY, []);
  }

  getQueueSummary() {
    const jobs = this.listJobs();
    const byType = Object.values(QUEUE_TYPES).map((type) => ({
      type,
      queued: jobs.filter((job) => job.type === type && job.status === 'QUEUED').length,
      processing: jobs.filter((job) => job.type === type && job.status === 'PROCESSING').length,
      failed: jobs.filter((job) => job.type === type && job.status === 'FAILED').length,
      completed: jobs.filter((job) => job.type === type && job.status === 'COMPLETED').length
    }));
    return {
      total: jobs.length,
      queued: jobs.filter((job) => job.status === 'QUEUED').length,
      processing: jobs.filter((job) => job.status === 'PROCESSING').length,
      failed: jobs.filter((job) => job.status === 'FAILED').length,
      deadLetter: this.listDeadLetters().length,
      byType
    };
  }
}

export const queueManager = new QueueManager();
