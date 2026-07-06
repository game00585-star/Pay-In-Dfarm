export class LaunchCenterService {
  async buildSnapshot({ platformService, productionReadinessService, operationsSnapshot }) {
    const platform = await platformService.getAdminConsoleSnapshot();
    const readiness = await productionReadinessService.getReadinessSnapshot(platformService);
    return {
      generatedAt: new Date().toISOString(),
      launchStatus: readiness.goLiveStatus === 'READY' && platform.health.status === 'OK' ? 'READY' : 'PREPARING',
      systemStatus: platform.health.status,
      aiStatus: platform.health.services.find((item) => item.name === 'Ollama')?.status || 'UNKNOWN',
      ocrStatus: platform.health.services.find((item) => item.name === 'PaddleOCR')?.status || 'UNKNOWN',
      workflowStatus: operationsSnapshot?.workflowSla?.passRate >= 95 ? 'READY' : 'WATCH',
      databaseStatus: platform.health.services.find((item) => item.name === 'Database')?.status || 'UNKNOWN',
      storageStatus: platform.health.services.find((item) => item.name === 'Storage')?.status || 'UNKNOWN',
      queueStatus: platform.queues.deadLetter ? 'WARN' : 'READY',
      workerStatus: platform.workers.online > 0 ? 'READY' : 'WARN',
      backupStatus: platform.backups.length ? 'READY' : 'BACKUP_REQUIRED',
      healthScore: readiness.healthScore,
      checklist: [
        'System Status',
        'AI Status',
        'OCR Status',
        'Workflow',
        'Database',
        'Storage',
        'Queue',
        'Worker',
        'Backup',
        'Health'
      ]
    };
  }
}

export const launchCenterService = new LaunchCenterService();
