export class DuplicateDetectionService {
  detect({ records = [], documents = [] } = {}) {
    return [
      ...this.detectBy(records, (record) => record.referenceNo, 'REFERENCE_DUPLICATE', 'Transaction'),
      ...this.detectBy(documents, (doc) => doc.imageHash || doc.checksum || doc.fingerprint?.imageHash, 'DOCUMENT_DUPLICATE', 'Document'),
      ...this.detectBy(documents, (doc) => JSON.stringify(doc.ocrResult || doc.parsedData || ''), 'OCR_RESULT_DUPLICATE', 'OCR Result')
    ];
  }

  detectBy(items, keyFn, issueType, entityType) {
    const groups = items.reduce((acc, item) => {
      const key = keyFn(item);
      if (!key || key === '{}' || key === '""') return acc;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
    return Object.entries(groups)
      .filter(([, values]) => values.length > 1)
      .flatMap(([key, values]) => values.map((item) => ({
        issueId: `DQ-${issueType}-${key}-${item.id || item.documentId || item.filename || Math.random().toString(16).slice(2)}`.replace(/[^A-Za-z0-9-_]/g, '-'),
        branchCode: item.branchCode || item.branch || '',
        businessDate: item.businessDate || item.date || '',
        entityType,
        recordId: item.id || item.documentId || item.recordId || item.filename || '',
        issueType,
        severity: issueType === 'DOCUMENT_DUPLICATE' ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        resolvedAt: ''
      })));
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
