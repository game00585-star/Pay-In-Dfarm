import { DUPLICATE_STATUS, DUPLICATE_TYPES } from './DuplicateRules.js';

export function createDuplicateResult({
  isDuplicate = false,
  duplicateType = DUPLICATE_TYPES.NONE,
  status = DUPLICATE_STATUS.PASS,
  similarityScore = 0,
  matchedDocumentId = '',
  matchedRecordId = '',
  matchedFilename = '',
  warnings = [],
  riskFlags = []
} = {}) {
  return {
    isDuplicate,
    duplicateType,
    status,
    similarityScore,
    matchedDocumentId,
    matchedRecordId,
    matchedFilename,
    warnings,
    riskFlags
  };
}
