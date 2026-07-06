import { documentRepository } from './DocumentRepository.js';
import { documentHistoryService, DOCUMENT_HISTORY_ACTIONS } from './DocumentHistoryService.js';
import { documentCompareService } from './DocumentCompareService.js';

export const DOCUMENT_VERSION_TYPES = Object.freeze([
  'SHIFT_REPORT',
  'PAYIN',
  'BANK_TRANSFER',
  'MAEMANEE',
  'CRM',
  'DEBTOR_TRANSFER',
  'SUPPORTING_DOCUMENT',
  'OTHER'
]);

const TYPE_MAP = Object.freeze({
  POS_SUMMARY: 'SHIFT_REPORT',
  PAYIN_BANK_COUNTER: 'PAYIN',
  PAYIN_ATM: 'PAYIN',
  PAYIN_COUNTER_SERVICE: 'PAYIN',
  PAYIN_LOTUS: 'PAYIN',
  BANK_TRANSFER_SLIP: 'BANK_TRANSFER',
  MAEMANEE_QR_ALERT: 'MAEMANEE',
  CRM_COUPON_RECEIPT: 'CRM',
  DEBTOR_TRANSFER_RECEIPT: 'DEBTOR_TRANSFER'
});

function visibleByRole(document, user = {}) {
  if (!user) return false;
  if (user.role === 'BRANCH') return document.branchCode === user.branch || document.branchName === user.branch;
  if (user.role === 'REGIONAL_MANAGER') return String(document.branchName || document.branchCode || '').includes(user.region || user.branch || '');
  return ['ADMIN', 'ACCOUNTING', 'AUDIT', 'EXECUTIVE'].includes(user.role);
}

async function sha256(value = '') {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash) + text.charCodeAt(index);
  return `mock-sha256-${Math.abs(hash)}`;
}

function normalizeDocumentType(type = '') {
  return TYPE_MAP[type] || type || 'OTHER';
}

function makeDocumentFromRecord(record = {}, sourceDocument = {}) {
  const now = new Date().toISOString();
  return {
    documentId: `DOC-${record.id || 'record'}-${sourceDocument.id || sourceDocument.filename || Date.now()}`.replace(/[^A-Za-z0-9-_]/g, '-'),
    sourceRecordId: record.id || '',
    sourceDocumentId: sourceDocument.id || '',
    branchCode: record.branchCode || record.branch || 'UNKNOWN',
    branchName: record.branch || record.branchName || '',
    businessDate: record.businessDate || record.date || now.slice(0, 10),
    shift: record.shift || '',
    documentType: normalizeDocumentType(sourceDocument.documentType),
    originalDocumentType: sourceDocument.documentType || 'UNKNOWN',
    currentVersion: 1,
    status: 'ACTIVE',
    riskFlags: [],
    thumbnailUrl: sourceDocument.thumbnailUrl || sourceDocument.imageUrl || '',
    createdAt: sourceDocument.uploadedAt || record.createdAt || now,
    updatedAt: now
  };
}

export class DocumentVersionService {
  constructor({ repository = documentRepository, historyService = documentHistoryService, compareService = documentCompareService } = {}) {
    this.repository = repository;
    this.historyService = historyService;
    this.compareService = compareService;
  }

  async syncFromPayinRecords(records = [], actor = {}) {
    const created = [];
    for (const record of records) {
      for (const sourceDocument of record.documents || []) {
        const document = makeDocumentFromRecord(record, sourceDocument);
        const exists = this.repository.getDocument(document.documentId);
        if (!exists) {
          this.repository.saveDocument(document);
          const version = await this.createVersion(document.documentId, {
            fileName: sourceDocument.filename || sourceDocument.originalFilename || 'document',
            fileType: sourceDocument.mimeType || sourceDocument.fileType || 'image',
            fileSize: sourceDocument.fileSize || 0,
            uploadedBy: sourceDocument.uploadedBy || record.createdBy || actor.email || 'system',
            uploadedAt: sourceDocument.uploadedAt || record.createdAt || document.createdAt,
            ocrResult: sourceDocument.ocrResult || sourceDocument.parsedData || {},
            aiResult: sourceDocument.aiResult || sourceDocument.classificationResult || {},
            parsedData: sourceDocument.parsedData || {},
            thumbnailUrl: sourceDocument.thumbnailUrl || sourceDocument.imageUrl || '',
            imageUrl: sourceDocument.imageUrl || '',
            checksumSource: `${sourceDocument.imageUrl || ''}|${sourceDocument.filename || ''}|${sourceDocument.fileSize || ''}`,
            changeReason: 'Initial upload'
          }, actor, { skipDocumentEvent: true });
          created.push({ document, version });
          this.historyService.record(document.documentId, DOCUMENT_HISTORY_ACTIONS.CREATE_DOCUMENT, actor, { sourceRecordId: record.id });
        }
      }
    }
    return created;
  }

  listDocuments(user = null, filters = {}) {
    return this.repository.listDocuments()
      .filter((document) => visibleByRole(document, user))
      .filter((document) => !filters.branchCode || document.branchCode === filters.branchCode || document.branchName === filters.branchCode)
      .filter((document) => !filters.businessDate || document.businessDate === filters.businessDate)
      .filter((document) => !filters.shift || document.shift === filters.shift)
      .filter((document) => !filters.documentType || document.documentType === filters.documentType)
      .filter((document) => !filters.status || document.status === filters.status)
      .filter((document) => {
        const keyword = String(filters.search || '').toLowerCase();
        if (!keyword) return true;
        return [document.documentId, document.branchCode, document.branchName, document.sourceRecordId, document.originalDocumentType]
          .some((value) => String(value || '').toLowerCase().includes(keyword));
      })
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async createVersion(documentId, input = {}, actor = {}, options = {}) {
    const document = this.repository.getDocument(documentId);
    if (!document) throw new Error(`Document not found: ${documentId}`);
    const versions = this.repository.listVersions(documentId);
    const nextVersionNumber = versions.length ? Math.max(...versions.map((item) => Number(item.versionNumber || 0))) + 1 : 1;
    const checksum = input.checksum || await sha256(input.checksumSource || {
      documentId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      uploadedAt: input.uploadedAt,
      parsedData: input.parsedData
    });
    const duplicate = this.repository.listVersions().find((item) => item.documentId !== documentId && item.checksum === checksum);
    const version = {
      versionId: `VER-${documentId}-${nextVersionNumber}-${Date.now()}`,
      documentId,
      versionNumber: nextVersionNumber,
      fileName: input.fileName || `document-v${nextVersionNumber}`,
      fileType: input.fileType || 'image',
      fileSize: Number(input.fileSize || 0),
      uploadedBy: input.uploadedBy || actor.email || actor.name || 'system',
      uploadedAt: input.uploadedAt || new Date().toISOString(),
      ocrResultId: input.ocrResultId || '',
      aiResultId: input.aiResultId || '',
      checksum,
      isCurrent: true,
      changeReason: input.changeReason || 'New version',
      ocrResult: input.ocrResult || {},
      aiResult: input.aiResult || {},
      parsedData: input.parsedData || {},
      imageUrl: input.imageUrl || '',
      thumbnailUrl: input.thumbnailUrl || '',
      duplicateDocumentId: duplicate?.documentId || '',
      riskFlags: duplicate ? ['DUPLICATE_DOCUMENT'] : []
    };
    versions.forEach((item) => this.repository.saveVersion({ ...item, isCurrent: false }));
    this.repository.saveVersion(version);
    this.repository.saveDocument({
      ...document,
      currentVersion: version.versionNumber,
      status: duplicate ? 'DUPLICATE_REVIEW' : document.status,
      riskFlags: Array.from(new Set([...(document.riskFlags || []), ...(duplicate ? ['DUPLICATE_DOCUMENT'] : [])])),
      updatedAt: new Date().toISOString()
    });
    if (!options.skipDocumentEvent) this.historyService.record(documentId, DOCUMENT_HISTORY_ACTIONS.CREATE_VERSION, actor, { versionId: version.versionId, reason: version.changeReason });
    return version;
  }

  restoreVersion(documentId, versionId, actor = {}, reason = 'Restore version') {
    const document = this.repository.getDocument(documentId);
    const versions = this.repository.listVersions(documentId);
    const target = versions.find((item) => item.versionId === versionId);
    if (!document || !target) return null;
    versions.forEach((item) => this.repository.saveVersion({ ...item, isCurrent: item.versionId === versionId }));
    const restored = { ...document, currentVersion: target.versionNumber, updatedAt: new Date().toISOString() };
    this.repository.saveDocument(restored);
    this.historyService.record(documentId, DOCUMENT_HISTORY_ACTIONS.RESTORE_VERSION, actor, { versionId, reason });
    return restored;
  }

  commentVersion(documentId, versionId, comment, actor = {}) {
    const version = this.repository.listVersions(documentId).find((item) => item.versionId === versionId);
    if (!version) return null;
    const next = {
      ...version,
      comments: [{
        commentId: `doc-version-comment-${Date.now()}`,
        comment,
        createdBy: actor.email || actor.name || 'system',
        createdAt: new Date().toISOString()
      }, ...(version.comments || [])]
    };
    this.repository.saveVersion(next);
    this.historyService.record(documentId, DOCUMENT_HISTORY_ACTIONS.COMMENT_VERSION, actor, { versionId, comment });
    return next;
  }

  compare(documentId, previousVersionId, nextVersionId) {
    const versions = this.repository.listVersions(documentId);
    return this.compareService.compareVersions(
      versions.find((item) => item.versionId === previousVersionId),
      versions.find((item) => item.versionId === nextVersionId)
    );
  }

  getDocumentDetail(documentId) {
    const document = this.repository.getDocument(documentId);
    return {
      document,
      versions: this.repository.listVersions(documentId).sort((a, b) => Number(b.versionNumber) - Number(a.versionNumber)),
      timeline: this.historyService.getTimeline(documentId)
    };
  }
}

export const documentVersionService = new DocumentVersionService();
