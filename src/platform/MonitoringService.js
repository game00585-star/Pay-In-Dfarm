export class MonitoringService {
  constructor({ queueManager, workerManager, storageManager } = {}) {
    this.queueManager = queueManager;
    this.workerManager = workerManager;
    this.storageManager = storageManager;
  }

  getMetrics() {
    const queue = this.queueManager?.getQueueSummary?.() || { queued: 0, processing: 0 };
    const workers = this.workerManager?.getWorkerSummary?.() || { online: 0, workers: [] };
    const storage = this.storageManager?.getUsage?.() || { totalBytes: 0 };
    return {
      cpu: 34,
      ram: 58,
      disk: Math.min(95, Math.round((storage.totalBytes || 0) / 1024 / 1024) + 12),
      gpu: 22,
      averageOcrTimeMs: 1850,
      averageAiTimeMs: 4200,
      queueWaiting: queue.queued,
      workerOnline: workers.online,
      workerTotal: workers.total || workers.workers?.length || 0,
      storageBytes: storage.totalBytes,
      databaseStatus: 'MOCK_ONLINE',
      storageStatus: 'LOCAL_ONLINE',
      createdAt: new Date().toISOString()
    };
  }
}

export const monitoringService = new MonitoringService();
