const STORE_KEY = 'dfarm_duplicate_fingerprint_index';

function readLocalIndex() {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalIndex(items) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

function flattenRecords(records = []) {
  return records.flatMap((record) => (record.documents || []).map((document) => ({
    recordId: record.id,
    documentId: document.id,
    filename: document.filename || document.originalFilename || document.fileName || '',
    referenceNo: document.parsedData?.referenceNo || record.referenceNo || '',
    imageHash: document.fingerprint?.imageHash || document.imageHash || '',
    md5Hash: document.fingerprint?.md5Hash || document.md5Hash || '',
    perceptualHash: document.fingerprint?.perceptualHash || document.perceptualHash || '',
    averageHash: document.fingerprint?.averageHash || document.averageHash || '',
    differenceHash: document.fingerprint?.differenceHash || document.differenceHash || ''
  })));
}

export class DuplicateRepository {
  get name() {
    return 'DuplicateRepository';
  }

  async findCandidates({ records = [], dataset = [] } = {}) {
    return [
      ...readLocalIndex(),
      ...flattenRecords(records),
      ...dataset
    ].filter(Boolean);
  }

  async saveFingerprint(entry) {
    const items = readLocalIndex();
    const exists = items.some((item) => item.documentId === entry.documentId && item.recordId === entry.recordId);
    const nextItems = exists
      ? items.map((item) => item.documentId === entry.documentId && item.recordId === entry.recordId ? entry : item)
      : [entry, ...items];
    writeLocalIndex(nextItems.slice(0, 5000));
    return entry;
  }
}

export const duplicateRepository = new DuplicateRepository();
