import { goLiveChecklistService } from './GoLiveChecklistService.js';
import { performanceTestService } from './PerformanceTestService.js';
import { securityTestService } from './SecurityTestService.js';
import { uatService } from './UATService.js';

export class ProductionReadinessService {
  constructor({
    checklistService = goLiveChecklistService,
    uat = uatService,
    performance = performanceTestService,
    security = securityTestService,
    platformService = null
  } = {}) {
    this.checklistService = checklistService;
    this.uat = uat;
    this.performance = performance;
    this.security = security;
    this.platformService = platformService;
  }

  async getReadinessSnapshot(platformService = this.platformService) {
    const platform = platformService ? await platformService.getAdminConsoleSnapshot() : null;
    const checklist = this.checklistService.listItems();
    const checklistResult = this.checklistService.evaluate(checklist);
    const uatSummary = this.uat.summary();
    const securityTests = this.security.listTests();
    const performanceRuns = this.performance.listRuns();
    const latestPerformance = performanceRuns[0] || null;
    const securityPassed = securityTests.filter((test) => test.status === 'PASS').length;
    const securityPercent = securityTests.length ? Math.round((securityPassed / securityTests.length) * 100) : 100;
    const uatPercent = uatSummary.total ? Math.round((uatSummary.approved / uatSummary.total) * 100) : 100;
    const healthScore = Math.round((checklistResult.overallPercent + securityPercent + uatPercent + (platform?.health?.status === 'OK' ? 100 : 80)) / 4);

    return {
      generatedAt: new Date().toISOString(),
      platform,
      checklist,
      checklistResult,
      uatSummary,
      securityTests,
      securityPercent,
      performanceRuns,
      latestPerformance,
      healthScore,
      goLiveStatus: checklistResult.ready && securityPercent === 100 && uatPercent >= 95 ? 'READY' : 'NOT_READY',
      deploymentStatus: checklistResult.ready ? 'READY_FOR_DEPLOYMENT' : 'PREPARING',
      backupStatus: platform?.backups?.length ? 'BACKUP_AVAILABLE' : 'BACKUP_REQUIRED'
    };
  }
}

export const productionReadinessService = new ProductionReadinessService();
