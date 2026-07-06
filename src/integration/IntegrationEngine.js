export class IntegrationEngine {
  constructor({ repository, logService }) {
    this.repository = repository;
    this.logService = logService;
  }

  createJob({ integrationType = 'REST_API', sourceSystem = 'Financial Platform', destinationSystem = 'External System' } = {}) {
    const now = new Date().toISOString();
    return this.repository.saveJob({
      jobId: `int-job-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      integrationType,
      sourceSystem,
      destinationSystem,
      status: 'QUEUED',
      retryCount: 0,
      startedAt: '',
      finishedAt: '',
      createdAt: now
    });
  }

  runJob(job) {
    const startedAt = new Date().toISOString();
    const finishedAt = new Date().toISOString();
    const next = { ...job, status: 'SUCCESS', startedAt, finishedAt };
    this.repository.saveJob(next);
    this.logService.log({
      jobId: job.jobId,
      request: { sourceSystem: job.sourceSystem, destinationSystem: job.destinationSystem },
      response: { ok: true, mode: 'LOCAL_MOCK' },
      status: 'SUCCESS',
      durationMs: 120,
      retryCount: job.retryCount
    });
    return next;
  }

  failJob(job, error = 'Integration failed') {
    const next = {
      ...job,
      status: job.retryCount >= 3 ? 'DEAD_LETTER' : 'FAILED',
      retryCount: job.retryCount + 1,
      finishedAt: new Date().toISOString(),
      error
    };
    if (next.status === 'DEAD_LETTER') this.repository.saveDeadLetter(next);
    this.repository.saveJob(next);
    this.logService.log({ jobId: job.jobId, status: next.status, error, retryCount: next.retryCount });
    return next;
  }

  retryJob(job) {
    const queued = { ...job, status: 'QUEUED', retryCount: job.retryCount + 1, startedAt: '', finishedAt: '' };
    this.repository.saveJob(queued);
    this.logService.log({ jobId: job.jobId, status: 'RETRY', retryCount: queued.retryCount });
    return queued;
  }
}
