export class WebhookService {
  constructor({ integrationEngine, logService }) {
    this.integrationEngine = integrationEngine;
    this.logService = logService;
  }

  receive({ sourceSystem = 'External System', payload = {} } = {}) {
    const job = this.integrationEngine.createJob({
      integrationType: 'WEBHOOK_INCOMING',
      sourceSystem,
      destinationSystem: 'Financial Platform'
    });
    this.logService.log({ jobId: job.jobId, request: payload, status: 'WEBHOOK_RECEIVED' });
    return job;
  }

  send({ destinationSystem = 'External System', payload = {} } = {}) {
    const job = this.integrationEngine.createJob({
      integrationType: 'WEBHOOK_OUTGOING',
      sourceSystem: 'Financial Platform',
      destinationSystem
    });
    this.logService.log({ jobId: job.jobId, request: payload, status: 'WEBHOOK_QUEUED' });
    return job;
  }
}
