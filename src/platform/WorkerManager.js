export const WORKER_TYPES = Object.freeze({
  OCR: 'OCR_WORKER',
  AI: 'AI_WORKER',
  VALIDATION: 'VALIDATION_WORKER',
  RECONCILIATION: 'RECONCILIATION_WORKER',
  RISK: 'RISK_WORKER',
  NOTIFICATION: 'NOTIFICATION_WORKER'
});

export class WorkerManager {
  constructor({ queueManager } = {}) {
    this.queueManager = queueManager;
  }

  listWorkers() {
    return Object.values(WORKER_TYPES).map((type, index) => ({
      workerId: `worker-${index + 1}`,
      type,
      status: index < 4 ? 'ONLINE' : 'IDLE',
      currentJobId: '',
      processedToday: 120 - index * 11,
      failedToday: index % 2,
      averageProcessingTimeMs: 1800 + index * 350,
      lastHeartbeat: new Date().toISOString()
    }));
  }

  pauseWorker(workerId) {
    return { workerId, status: 'PAUSED', updatedAt: new Date().toISOString() };
  }

  resumeWorker(workerId) {
    return { workerId, status: 'ONLINE', updatedAt: new Date().toISOString() };
  }

  getWorkerSummary() {
    const workers = this.listWorkers();
    return {
      total: workers.length,
      online: workers.filter((worker) => worker.status === 'ONLINE').length,
      idle: workers.filter((worker) => worker.status === 'IDLE').length,
      paused: workers.filter((worker) => worker.status === 'PAUSED').length,
      workers
    };
  }
}

export const workerManager = new WorkerManager();
