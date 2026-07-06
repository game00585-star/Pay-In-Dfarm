import { ApiGatewayService } from './ApiGatewayService.js';
import { ConnectorManager } from './ConnectorManager.js';
import { IntegrationEngine } from './IntegrationEngine.js';
import { IntegrationLogService } from './IntegrationLogService.js';
import { integrationRepository } from './IntegrationRepository.js';
import { IntegrationScheduler } from './IntegrationScheduler.js';
import { WebhookService } from './WebhookService.js';

export class IntegrationService {
  constructor({ repository = integrationRepository } = {}) {
    this.repository = repository;
    this.logService = new IntegrationLogService({ repository });
    this.engine = new IntegrationEngine({ repository, logService: this.logService });
    this.connectorManager = new ConnectorManager({ repository });
    this.scheduler = new IntegrationScheduler({ integrationEngine: this.engine, connectorManager: this.connectorManager });
    this.webhookService = new WebhookService({ integrationEngine: this.engine, logService: this.logService });
    this.apiGateway = new ApiGatewayService({ repository });
  }

  getDashboard() {
    const jobs = this.repository.listJobs();
    const logs = this.repository.listLogs();
    const success = jobs.filter((job) => job.status === 'SUCCESS').length;
    const fail = jobs.filter((job) => job.status === 'FAILED' || job.status === 'DEAD_LETTER').length;
    const retry = logs.filter((log) => log.status === 'RETRY').length;
    const durations = logs.map((log) => Number(log.durationMs || 0)).filter(Boolean);
    return {
      success,
      fail,
      retry,
      queue: jobs.filter((job) => job.status === 'QUEUED').length,
      latency: durations.length ? Math.round(durations.reduce((sum, item) => sum + item, 0) / durations.length) : 0,
      lastSync: jobs.find((job) => job.finishedAt)?.finishedAt || '',
      jobs,
      logs,
      connectors: this.connectorManager.listConnectors(),
      schedules: this.scheduler.listSchedules(),
      apiKeys: this.apiGateway.listApiKeys(),
      deadLetters: this.repository.listDeadLetters()
    };
  }
}

export const integrationService = new IntegrationService();
