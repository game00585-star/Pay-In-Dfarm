function flattenObject(input = {}, prefix = '') {
  return Object.entries(input || {}).reduce((items, [key, value]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...items, ...flattenObject(value, field) };
    }
    return { ...items, [field]: value };
  }, {});
}

function diffMap(before = {}, after = {}) {
  const left = flattenObject(before);
  const right = flattenObject(after);
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
  return keys
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .map((field) => ({ field, before: left[field] ?? '', after: right[field] ?? '' }));
}

export class DocumentCompareService {
  compareVersions(previousVersion = {}, nextVersion = {}) {
    return {
      previousVersionId: previousVersion.versionId || '',
      nextVersionId: nextVersion.versionId || '',
      fileDifference: diffMap({
        fileName: previousVersion.fileName,
        fileType: previousVersion.fileType,
        fileSize: previousVersion.fileSize,
        checksum: previousVersion.checksum
      }, {
        fileName: nextVersion.fileName,
        fileType: nextVersion.fileType,
        fileSize: nextVersion.fileSize,
        checksum: nextVersion.checksum
      }),
      ocrDifference: diffMap(previousVersion.ocrResult || {}, nextVersion.ocrResult || {}),
      aiDifference: diffMap(previousVersion.aiResult || {}, nextVersion.aiResult || {}),
      fieldDifference: diffMap(previousVersion.parsedData || {}, nextVersion.parsedData || {})
    };
  }
}

export const documentCompareService = new DocumentCompareService();
