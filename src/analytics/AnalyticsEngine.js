import { analyticsRepository } from './AnalyticsRepository.js';
import { branchPerformanceService } from './BranchPerformanceService.js';
import { comparisonService } from './ComparisonService.js';
import { executiveDashboardService } from './ExecutiveDashboardService.js';
import { forecastDataService } from './ForecastDataService.js';
import { kpiService } from './KPIService.js';
import { trendAnalysisService } from './TrendAnalysisService.js';

function inDateRange(record, filters = {}) {
  const date = String(record.businessDate || record.date || record.createdAt || '').slice(0, 10);
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

function filterByRole(records = [], user = {}) {
  if (!user) return [];
  if (user.role === 'BRANCH') return records.filter((record) => record.branch === user.branch || record.branchCode === user.branch);
  if (user.role === 'REGIONAL_MANAGER') return records.filter((record) => String(record.region || record.branch || '').includes(user.region || user.branch || ''));
  return records;
}

function applyFilters(records = [], filters = {}) {
  return records
    .filter((record) => inDateRange(record, filters))
    .filter((record) => !filters.branch || record.branch === filters.branch || record.branchCode === filters.branch)
    .filter((record) => !filters.region || record.region === filters.region || String(record.branch || '').includes(filters.region))
    .filter((record) => !filters.shift || record.shift === filters.shift)
    .filter((record) => !filters.workflowStatus || record.status === filters.workflowStatus)
    .filter((record) => !filters.riskLevel || riskLevel(record.riskScore) === filters.riskLevel)
    .filter((record) => !filters.documentType || (record.documents || []).some((document) => document.documentType === filters.documentType));
}

function riskLevel(score = 0) {
  const value = Number(score || 0);
  if (value >= 80) return 'CRITICAL';
  if (value >= 60) return 'HIGH';
  if (value >= 40) return 'MEDIUM';
  if (value >= 20) return 'LOW';
  return 'PASS';
}

export class AnalyticsEngine {
  constructor({ repository = analyticsRepository } = {}) {
    this.repository = repository;
  }

  buildSnapshot({ records = [], workflowCases = [], cases = [], auditLogs = [], masterData = {}, user = {}, filters = {}, period = 'Daily' } = {}) {
    const config = this.repository.getConfig();
    const scopedRecords = applyFilters(filterByRole(records, user), filters);
    const branches = masterData.branches || [];
    const branchGroups = branchPerformanceService.groupRecordsByBranch(scopedRecords, branches);
    const branchKpis = branchGroups.map((group) => kpiService.calculateBranchKpi(group));
    const accountingKpi = kpiService.calculateAccountingKpi(scopedRecords, workflowCases);
    const auditKpi = kpiService.calculateAuditKpi(scopedRecords, cases);
    const executiveKpi = kpiService.calculateExecutiveKpi(scopedRecords, cases, workflowCases);
    const regionalKpi = kpiService.calculateRegionalKpi(branchKpis, scopedRecords);
    const trend = trendAnalysisService.build(scopedRecords, period);
    const ranking = {
      top10: branchPerformanceService.rank(branchKpis, 'branchScore', 10),
      top20: branchPerformanceService.rank(branchKpis, 'branchScore', 20),
      top50: branchPerformanceService.rank(branchKpis, 'branchScore', 50),
      lowest10: branchPerformanceService.rank(branchKpis, 'branchScore', 10, 'asc')
    };
    const workflowStatus = {
      pending: scopedRecords.filter((record) => ['PENDING_ACCOUNTING', 'HIGH_RISK', 'NEED_RETAKE'].includes(record.status)).length,
      approved: scopedRecords.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length,
      returned: scopedRecords.filter((record) => record.status === 'RETURNED').length,
      overSla: workflowCases.filter((item) => item.sla?.overSla).length
    };
    const documents = scopedRecords.flatMap((record) => record.documents || []);
    const aiStatus = {
      processed: documents.filter((document) => document.parsedData || document.aiResult).length,
      lowConfidence: documents.filter((document) => Number(document.parsedData?.confidence || document.classificationResult?.confidence || 100) < 80).length,
      accuracy: executiveKpi.aiAccuracy
    };
    const ocrStatus = {
      processed: documents.filter((document) => document.rawText || document.ocrResult || document.parsedData).length,
      failed: documents.filter((document) => document.ocrStatus === 'FAILED').length,
      accuracy: executiveKpi.ocrAccuracy
    };
    const summary = {
      todaySummary: {
        records: scopedRecords.filter((record) => String(record.createdAt || record.date).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        documents: documents.length,
        pendingReview: accountingKpi.pendingReview,
        highRisk: scopedRecords.filter((record) => Number(record.riskScore || 0) >= 70).length,
        totalDifference: executiveKpi.totalDifference
      },
      companyOverview: {
        branches: branchKpis.length,
        records: scopedRecords.length,
        documents: documents.length,
        cases: cases.length,
        auditEvents: auditLogs.length
      }
    };

    return {
      generatedAt: new Date().toISOString(),
      config,
      filters,
      period,
      executiveDashboard: executiveDashboardService.build({ summary, branchKpis, accountingKpi, auditKpi, regionalKpi, executiveKpi, workflowStatus, aiStatus, ocrStatus }),
      branchKpis,
      accountingKpi,
      auditKpi,
      regionalKpi,
      executiveKpi,
      trend,
      forecast: forecastDataService.buildForecast(trend),
      comparison: comparisonService.compareBranches(branchKpis, filters.compareBranches || []),
      ranking,
      heatMap: {
        company: branchPerformanceService.heatMap(branchKpis),
        region: regionalKpi,
        branch: branchPerformanceService.heatMap(branchKpis)
      },
      scheduledReports: this.repository.listScheduledReports(),
      layout: this.repository.getLayout(user.email || user.name || user.role || 'default'),
      cacheStatus: 'BACKGROUND_CACHE_READY'
    };
  }

  buildCachedSnapshot(input = {}) {
    const cacheKey = JSON.stringify({ user: input.user?.email || input.user?.role, filters: input.filters, period: input.period });
    const cached = this.repository.getCache(cacheKey);
    const ttl = this.repository.getConfig().cacheTtlMinutes * 60000;
    if (cached && Date.now() - new Date(cached.cachedAt).getTime() < ttl) return { ...cached.value, cacheStatus: 'CACHE_HIT' };
    const snapshot = this.buildSnapshot(input);
    this.repository.setCache(cacheKey, snapshot);
    return { ...snapshot, cacheStatus: 'CACHE_REFRESHED' };
  }
}

export const analyticsEngine = new AnalyticsEngine();
