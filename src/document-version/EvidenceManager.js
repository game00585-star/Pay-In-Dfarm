import { documentRepository } from './DocumentRepository.js';
import { documentHistoryService, DOCUMENT_HISTORY_ACTIONS } from './DocumentHistoryService.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export class EvidenceManager {
  constructor({ repository = documentRepository, historyService = documentHistoryService } = {}) {
    this.repository = repository;
    this.historyService = historyService;
  }

  buildEvidencePackage(documentId, context = {}) {
    const document = this.repository.getDocument(documentId);
    const versions = this.repository.listVersions(documentId);
    const timeline = this.historyService.getTimeline(documentId);
    const sourceRecord = safeArray(context.records).find((record) => (
      record.id === document?.sourceRecordId || safeArray(record.documents).some((item) => item.id === document?.sourceDocumentId)
    ));
    const auditLogs = safeArray(context.auditLogs).filter((log) => (
      log.recordId === sourceRecord?.id || log.recordId === documentId || log.recordId === document?.sourceRecordId
    ));
    const evidence = {
      evidenceId: `evidence-${documentId}-${Date.now()}`,
      documentId,
      originalFile: versions.find((item) => item.versionNumber === 1) || versions.at(-1) || null,
      currentVersion: versions.find((item) => item.isCurrent) || versions[0] || null,
      thumbnail: versions.find((item) => item.thumbnailUrl)?.thumbnailUrl || document?.thumbnailUrl || '',
      ocrResult: versions.find((item) => item.isCurrent)?.ocrResult || {},
      aiResult: versions.find((item) => item.isCurrent)?.aiResult || {},
      correctionHistory: safeArray(sourceRecord?.correctionHistory),
      workflowHistory: safeArray(sourceRecord?.workflowHistory || sourceRecord?.timeline),
      auditLog: auditLogs,
      timeline,
      exportedAt: new Date().toISOString()
    };
    this.repository.saveEvidence(evidence);
    return evidence;
  }

  exportEvidence(documentId, actor = {}, context = {}) {
    const evidence = this.buildEvidencePackage(documentId, context);
    this.historyService.record(documentId, DOCUMENT_HISTORY_ACTIONS.EXPORT_EVIDENCE, actor, { evidenceId: evidence.evidenceId });
    return evidence;
  }

  getDashboard(documents = this.repository.listDocuments()) {
    const today = new Date().toISOString().slice(0, 10);
    const versions = this.repository.listVersions();
    return {
      documentToday: documents.filter((item) => String(item.createdAt || '').slice(0, 10) === today).length,
      versionCreated: versions.filter((item) => String(item.uploadedAt || '').slice(0, 10) === today).length,
      duplicate: documents.filter((item) => safeArray(item.riskFlags).includes('DUPLICATE_DOCUMENT')).length,
      archive: documents.filter((item) => item.status === 'ARCHIVED').length,
      storageUsage: versions.reduce((sum, item) => sum + Number(item.fileSize || 0), 0)
    };
  }
}

export const evidenceManager = new EvidenceManager();
