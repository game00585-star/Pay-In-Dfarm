export class SystemHealthService {
  constructor({ queueManager, workerManager, monitoringService } = {}) {
    this.queueManager = queueManager;
    this.workerManager = workerManager;
    this.monitoringService = monitoringService;
  }

  async check() {
    const queue = this.queueManager?.getQueueSummary?.() || { failed: 0, deadLetter: 0 };
    const workers = this.workerManager?.getWorkerSummary?.() || { online: 0 };
    const metrics = this.monitoringService?.getMetrics?.() || {};
    return {
      status: queue.deadLetter > 0 ? 'WARN' : 'OK',
      checkedAt: new Date().toISOString(),
      services: [
        { name: 'API', status: 'OK', responseTimeMs: 12 },
        { name: 'Database', status: 'MOCK_ONLINE', responseTimeMs: 4 },
        { name: 'Storage', status: 'LOCAL_ONLINE', responseTimeMs: 3 },
        { name: 'Ollama', status: 'MOCK_OR_LOCAL', responseTimeMs: 0 },
        { name: 'PaddleOCR', status: 'MOCK_OR_LOCAL', responseTimeMs: 0 },
        { name: 'OpenCV', status: 'MOCK_OR_LOCAL', responseTimeMs: 0 },
        { name: 'Queue', status: queue.failed > 0 ? 'WARN' : 'OK', responseTimeMs: 2 },
        { name: 'Worker', status: workers.online > 0 ? 'OK' : 'WARN', responseTimeMs: 2 }
      ],
      metrics
    };
  }
}

export const systemHealthService = new SystemHealthService();
