import { auditFindingService } from '../audit-management/index.js';
import { complianceService } from '../compliance/index.js';
import { caseService } from '../case-management/index.js';
import { businessExceptionEngine } from '../business-exception/index.js';
import { fraudPatternEngine } from '../fraud-pattern/index.js';
import { masterDataService } from '../master-data/index.js';
import { workflowService } from '../workflow/index.js';

function dateInRange(value, filters = {}) {
  const date = String(value || '').slice(0, 10);
  if (filters.businessDate && date !== filters.businessDate) return false;
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

export class ContextRetriever {
  retrieve({ records = [], auditLogs = [], user = {}, filters = {} } = {}) {
    const scopedRecords = this.filterRecords(records, user, filters);
    const workflowCases = workflowService.syncFromRecords(scopedRecords);
    const cases = caseService.listCases(user);
    const exceptions = scopedRecords.flatMap((record) => businessExceptionEngine.buildForRecord(record));
    const fraud = fraudPatternEngine.analyze(scopedRecords);
    const auditFindings = auditFindingService.list().filter((item) => this.canAccess(user, item));
    const compliance = complianceService.buildSnapshot({ records: scopedRecords, exceptions, fraud, auditFindings, user });
    const masterData = masterDataService.getSnapshot(user);
    return {
      records: scopedRecords,
      documents: scopedRecords.flatMap((record) => (record.documents || []).map((document) => ({ ...document, recordId: record.id, branch: record.branch, businessDate: record.date, shift: record.shift }))),
      workflowCases,
      cases,
      exceptions,
      fraud,
      auditFindings,
      compliance,
      masterData,
      auditLogs: auditLogs.filter((log) => this.canAccess(user, log))
    };
  }

  filterRecords(records = [], user = {}, filters = {}) {
    return records
      .filter((record) => this.canAccess(user, record))
      .filter((record) => dateInRange(record.date || record.businessDate || record.createdAt, filters))
      .filter((record) => !filters.branch || record.branch === filters.branch || record.branchCode === filters.branch)
      .filter((record) => !filters.shift || record.shift === filters.shift)
      .filter((record) => !filters.documentType || (record.documents || []).some((document) => document.documentType === filters.documentType));
  }

  canAccess(user = {}, item = {}) {
    if (!user) return false;
    if (user.role === 'BRANCH') return [item.branch, item.branchName, item.branchCode].includes(user.branch);
    if (user.role === 'REGIONAL_MANAGER') return String(item.region || item.branch || item.branchName || '').includes(user.region || user.branch || '');
    return ['ADMIN', 'ACCOUNTING', 'AUDIT', 'EXECUTIVE'].includes(user.role);
  }
}

export const contextRetriever = new ContextRetriever();
