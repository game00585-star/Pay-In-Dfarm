const CACHE_KEY = 'dfarm_analytics_cache';
const CONFIG_KEY = 'dfarm_analytics_config';
const LAYOUT_KEY = 'dfarm_analytics_layouts';
const SCHEDULED_REPORT_KEY = 'dfarm_analytics_scheduled_reports';

const DEFAULT_CONFIG = {
  kpiFormulas: {
    documentCompleteness: 'completeRecords / totalRecords',
    documentSubmissionTime: 'onTimeSubmissions / totalRecords',
    averageReviewTime: 'reviewMinutes / reviewedRecords',
    differenceRate: 'recordsWithoutDifference / totalRecords',
    manualCorrectionRate: '1 - manualCorrections / totalDocuments',
    aiAccuracy: 'averageFieldConfidence',
    ocrAccuracy: 'ocrSuccessDocuments / totalDocuments',
    branchScore: 'weighted average of branch KPI'
  },
  cacheTtlMinutes: 10,
  backgroundJobEnabled: true,
  powerBiReady: true
};

const DEFAULT_LAYOUT = [
  'TODAY_SUMMARY',
  'COMPANY_OVERVIEW',
  'EXECUTIVE_KPI',
  'BRANCH_RANKING',
  'TREND_ANALYSIS',
  'HEAT_MAP'
];

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class AnalyticsRepository {
  getConfig() {
    return { ...DEFAULT_CONFIG, ...read(CONFIG_KEY, DEFAULT_CONFIG) };
  }

  saveConfig(config) {
    const next = { ...this.getConfig(), ...config, updatedAt: new Date().toISOString() };
    write(CONFIG_KEY, next);
    return next;
  }

  getCache(cacheKey) {
    return read(CACHE_KEY, {})[cacheKey] || null;
  }

  setCache(cacheKey, value) {
    const cache = read(CACHE_KEY, {});
    cache[cacheKey] = { value, cachedAt: new Date().toISOString() };
    write(CACHE_KEY, cache);
    return cache[cacheKey];
  }

  getLayout(userId = 'default') {
    const layouts = read(LAYOUT_KEY, {});
    return layouts[userId] || DEFAULT_LAYOUT;
  }

  saveLayout(userId = 'default', widgets = DEFAULT_LAYOUT) {
    const layouts = read(LAYOUT_KEY, {});
    layouts[userId] = widgets;
    write(LAYOUT_KEY, layouts);
    return widgets;
  }

  listScheduledReports() {
    return read(SCHEDULED_REPORT_KEY, []);
  }

  saveScheduledReport(report) {
    const saved = {
      reportId: report.reportId || `ANR-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      reportName: report.reportName || 'Executive Analytics Report',
      cadence: report.cadence || 'Daily',
      recipients: report.recipients || [],
      status: report.status || 'ACTIVE',
      filters: report.filters || {},
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const reports = this.listScheduledReports();
    const next = reports.some((item) => item.reportId === saved.reportId)
      ? reports.map((item) => (item.reportId === saved.reportId ? saved : item))
      : [saved, ...reports];
    write(SCHEDULED_REPORT_KEY, next);
    return saved;
  }
}

export const analyticsRepository = new AnalyticsRepository();
