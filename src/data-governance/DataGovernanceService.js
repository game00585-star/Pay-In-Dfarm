import { dataCatalogService } from './DataCatalogService.js';
import { dataLineageService } from './DataLineageService.js';
import { dataQualityService } from './DataQualityService.js';
import { metadataService } from './MetadataService.js';
import { retentionPolicyEngine } from './RetentionPolicyEngine.js';

export class DataGovernanceService {
  buildSnapshot({ records = [], masterData = {}, businessRules = [], trigger = 'BACKGROUND_JOB' } = {}) {
    const validation = dataQualityService.runValidation({ records, masterData }, trigger);
    const metadata = metadataService.ensureDefaults();
    const catalog = dataCatalogService.buildCatalog(businessRules);
    const lineage = dataLineageService.buildForRecords(records);
    const retentionPolicies = retentionPolicyEngine.listPolicies();
    const dashboard = dataQualityService.dashboard(records);
    const masterDataHealth = {
      branch: (masterData.branches || []).length,
      merchant: (masterData.merchants || []).length,
      bank: (masterData.bankAccounts || []).length,
      businessRule: (masterData.businessRules || []).length,
      workflow: businessRules.length,
      policy: retentionPolicies.length
    };
    return {
      generatedAt: new Date().toISOString(),
      dashboard,
      executiveDashboard: {
        companyDataQuality: dashboard.dataQualityScore,
        topQualityIssue: dashboard.issues[0]?.issueType || 'NONE',
        branchDataScore: this.branchScores(records, dashboard.issues),
        masterDataHealth
      },
      metadata,
      catalog,
      lineage,
      retentionPolicies,
      archives: retentionPolicyEngine.repository.list('archives'),
      validationRun: validation.run,
      warehouseReady: true,
      futureReady: ['Data Warehouse', 'Power BI', 'Microsoft Fabric', 'Lakehouse', 'ERP', 'POS', 'REST API']
    };
  }

  branchScores(records = [], issues = []) {
    const branches = Array.from(new Set(records.map((record) => record.branchCode || record.branch).filter(Boolean)));
    return branches.map((branch) => {
      const count = issues.filter((issue) => issue.branchCode === branch).length;
      return { branchCode: branch, score: Math.max(0, 100 - (count * 5)), issueCount: count };
    });
  }
}

export const dataGovernanceService = new DataGovernanceService();
