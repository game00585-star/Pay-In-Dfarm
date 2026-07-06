const DOCUMENTS_KEY = 'dfarm_document_version_documents';
const VERSIONS_KEY = 'dfarm_document_version_versions';
const EVENTS_KEY = 'dfarm_document_version_events';
const EVIDENCE_KEY = 'dfarm_document_version_evidence';
const RETENTION_KEY = 'dfarm_document_version_retention_policy';

function read(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function upsert(items, idField, item) {
  return items.some((entry) => entry[idField] === item[idField])
    ? items.map((entry) => (entry[idField] === item[idField] ? item : entry))
    : [item, ...items];
}

export class DocumentRepository {
  listDocuments() {
    return read(DOCUMENTS_KEY);
  }

  saveDocument(document) {
    write(DOCUMENTS_KEY, upsert(this.listDocuments(), 'documentId', document));
    return document;
  }

  getDocument(documentId) {
    return this.listDocuments().find((item) => item.documentId === documentId) || null;
  }

  listVersions(documentId = null) {
    const versions = read(VERSIONS_KEY);
    return documentId ? versions.filter((item) => item.documentId === documentId) : versions;
  }

  saveVersion(version) {
    write(VERSIONS_KEY, upsert(this.listVersions(), 'versionId', version));
    return version;
  }

  listEvents(documentId = null) {
    const events = read(EVENTS_KEY);
    return documentId ? events.filter((item) => item.documentId === documentId) : events;
  }

  appendEvent(event) {
    write(EVENTS_KEY, [event, ...this.listEvents()].slice(0, 100000));
    return event;
  }

  listEvidence(documentId = null) {
    const evidence = read(EVIDENCE_KEY);
    return documentId ? evidence.filter((item) => item.documentId === documentId) : evidence;
  }

  saveEvidence(item) {
    write(EVIDENCE_KEY, upsert(this.listEvidence(), 'evidenceId', item));
    return item;
  }

  getRetentionPolicy() {
    return read(RETENTION_KEY, {
      documentRetention: '5_YEARS',
      evidenceRetention: '10_YEARS',
      auditRetention: 'PERMANENT',
      archiveEnabled: true,
      updatedAt: ''
    });
  }

  saveRetentionPolicy(policy) {
    write(RETENTION_KEY, policy);
    return policy;
  }
}

export const documentRepository = new DocumentRepository();
