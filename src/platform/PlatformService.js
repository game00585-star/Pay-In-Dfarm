import { BackupService } from './BackupService.js';
import { DisasterRecoveryService } from './DisasterRecoveryService.js';
import { MonitoringService } from './MonitoringService.js';
import { QueueManager, QUEUE_TYPES } from './QueueManager.js';
import { SchedulerService } from './SchedulerService.js';
import { StorageManager } from './StorageManager.js';
import { SystemConfigurationService } from './SystemConfigurationService.js';
import { SystemHealthService } from './SystemHealthService.js';
import { WorkerManager } from './WorkerManager.js';

export class PlatformService {
  constructor({
    configurationService = new SystemConfigurationService(),
    queueManager = new QueueManager({ configurationService }),
    workerManager = new WorkerManager({ queueManager }),
    storageManager = new StorageManager(),
    monitoringService = new MonitoringService({ queueManager, workerManager, storageManager }),
    systemHealthService = new SystemHealthService({ queueManager, workerManager, monitoringService }),
    backupService = new BackupService(),
    disasterRecoveryService = new DisasterRecoveryService(),
    schedulerService = new SchedulerService()
  } = {}) {
    this.configurationService = configurationService;
    this.queueManager = queueManager;
    this.workerManager = workerManager;
    this.storageManager = storageManager;
    this.monitoringService = monitoringService;
    this.systemHealthService = systemHealthService;
    this.backupService = backupService;
    this.disasterRecoveryService = disasterRecoveryService;
    this.schedulerService = schedulerService;
  }

  async getAdminConsoleSnapshot() {
    const health = await this.systemHealthService.check();
    return {
      generatedAt: new Date().toISOString(),
      configuration: this.configurationService.getConfiguration(),
      health,
      queues: this.queueManager.getQueueSummary(),
      workers: this.workerManager.getWorkerSummary(),
      storage: this.storageManager.getUsage(),
      monitoring: this.monitoringService.getMetrics(),
      backups: this.backupService.listBackups(),
      schedules: this.schedulerService.listSchedules(),
      disasterRecovery: this.disasterRecoveryService.getChecklist()
    };
  }

  seedDemoJobs() {
    return [
      this.queueManager.enqueue(QUEUE_TYPES.AI_OCR, { source: 'demo' }),
      this.queueManager.enqueue(QUEUE_TYPES.VALIDATION, { source: 'demo' }),
      this.queueManager.enqueue(QUEUE_TYPES.RISK, { source: 'demo' }),
      this.queueManager.enqueue(QUEUE_TYPES.NOTIFICATION, { source: 'demo' }),
      this.queueManager.enqueue(QUEUE_TYPES.EXPORT, { source: 'demo' }),
      this.queueManager.enqueue(QUEUE_TYPES.REPORT, { source: 'demo' })
    ];
  }
}

export const platformService = new PlatformService();
