const STORAGE_OBJECTS_KEY = 'dfarm_platform_storage_objects';

export const STORAGE_BUCKETS = Object.freeze({
  ORIGINAL_IMAGE: 'ORIGINAL_IMAGE',
  THUMBNAIL: 'THUMBNAIL',
  OCR_RESULT: 'OCR_RESULT',
  AI_RESULT: 'AI_RESULT',
  CORRECTION_HISTORY: 'CORRECTION_HISTORY',
  AUDIT_LOG: 'AUDIT_LOG',
  EXPORT_FILE: 'EXPORT_FILE',
  BACKUP: 'BACKUP'
});

function readObjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_OBJECTS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeObjects(objects) {
  localStorage.setItem(STORAGE_OBJECTS_KEY, JSON.stringify(objects));
}

export class StorageManager {
  listObjects() {
    return readObjects();
  }

  registerObject(bucket, metadata = {}) {
    const object = {
      objectId: `sto-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      bucket,
      filename: metadata.filename || 'metadata.json',
      version: metadata.version || 1,
      sizeBytes: Number(metadata.sizeBytes || metadata.fileSize || 0),
      compressed: Boolean(metadata.compressed),
      archived: Boolean(metadata.archived),
      retentionUntil: metadata.retentionUntil || '',
      createdAt: new Date().toISOString(),
      ...metadata
    };
    writeObjects([object, ...this.listObjects()]);
    return object;
  }

  getUsage() {
    const objects = this.listObjects();
    const byBucket = Object.values(STORAGE_BUCKETS).map((bucket) => {
      const scoped = objects.filter((object) => object.bucket === bucket);
      return {
        bucket,
        count: scoped.length,
        sizeBytes: scoped.reduce((sum, object) => sum + Number(object.sizeBytes || 0), 0)
      };
    });
    return {
      totalObjects: objects.length,
      totalBytes: objects.reduce((sum, object) => sum + Number(object.sizeBytes || 0), 0),
      byBucket
    };
  }
}

export const storageManager = new StorageManager();
