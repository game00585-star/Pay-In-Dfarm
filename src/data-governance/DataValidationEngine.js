import { duplicateDetectionService } from './DuplicateDetectionService.js';
import { masterDataValidation } from './MasterDataValidation.js';

function issue(issueType, entityType, item, severity = 'MEDIUM') {
  return {
    issueId: `DQ-${issueType}-${item.id || item.recordId || item.branchCode || Math.random().toString(16).slice(2)}`.replace(/[^A-Za-z0-9-_]/g, '-'),
    branchCode: item.branchCode || item.branch || '',
    businessDate: item.date || item.businessDate || '',
    entityType,
    recordId: item.id || item.recordId || '',
    issueType,
    severity,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    resolvedAt: ''
  };
}

export class DataValidationEngine {
  validate({ records = [], masterData = {} } = {}) {
    const documents = records.flatMap((record) => (record.documents || []).map((document) => ({ ...document, recordId: record.id, branch: record.branch, branchCode: record.branchCode, businessDate: record.date })));
    const issues = [];
    records.forEach((record) => {
      if (!record.id || !record.branch || !record.date) issues.push(issue('MISSING_DATA', 'PayinRecord', record, 'HIGH'));
      if (record.date && !/^\d{4}-\d{2}-\d{2}/.test(String(record.date))) issues.push(issue('INVALID_FORMAT', 'PayinRecord', record, 'MEDIUM'));
      if (record.branch && masterData.branches?.length && !masterData.branches.some((branch) => branch.branchName === record.branch || branch.branchCode === record.branchCode)) issues.push(issue('BROKEN_REFERENCE', 'PayinRecord', record, 'HIGH'));
      if ((record.riskFlags || []).length || record.validationResult?.valid === false) issues.push(issue('BUSINESS_RULE_VIOLATION', 'PayinRecord', record, 'MEDIUM'));
      if (Math.abs(Number(record.difference || record.shiftReconciliation?.difference || 0)) > 10000) issues.push(issue('OUTLIER_DETECTION', 'PayinRecord', record, 'HIGH'));
    });
    documents.forEach((document) => {
      if (!document.documentType) issues.push(issue('MISSING_DATA', 'Document', document, 'MEDIUM'));
      if (document.uploadStatus === 'FAILED') issues.push(issue('INVALID_FORMAT', 'Document', document, 'MEDIUM'));
    });
    return [
      ...issues,
      ...duplicateDetectionService.detect({ records, documents }),
      ...masterDataValidation.validate(masterData)
    ];
  }

  validateImport(rows = [], entityType = 'Import') {
    return rows.flatMap((row, index) => (
      Object.values(row || {}).some((value) => value === '' || value == null)
        ? [issue('MISSING_DATA_BEFORE_IMPORT', entityType, { id: `${entityType}-${index}`, ...row }, 'MEDIUM')]
        : []
    ));
  }

  validateExport(rows = [], entityType = 'Export') {
    return rows.length ? [] : [issue('EMPTY_EXPORT_DATASET', entityType, { id: entityType }, 'LOW')];
  }
}

export const dataValidationEngine = new DataValidationEngine();
