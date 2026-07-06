import { DuplicateRepository } from './DuplicateRepository.js';
import {
  DUPLICATE_STATUS,
  DUPLICATE_THRESHOLDS,
  DUPLICATE_TYPES,
  riskFlagsForDuplicateType
} from './DuplicateRules.js';
import { createDuplicateResult } from './DuplicateResult.js';

function hammingSimilarity(left = '', right = '') {
  if (!left || !right) return 0;
  const maxLength = Math.max(left.length, right.length);
  let matches = 0;
  for (let index = 0; index < maxLength; index += 1) {
    if (left[index] && left[index] === right[index]) matches += 1;
  }
  return Number((matches / maxLength).toFixed(4));
}

function maxSimilarity(fingerprint, candidate) {
  return Math.max(
    hammingSimilarity(fingerprint.perceptualHash, candidate.perceptualHash),
    hammingSimilarity(fingerprint.averageHash, candidate.averageHash),
    hammingSimilarity(fingerprint.differenceHash, candidate.differenceHash)
  );
}

function referenceNoOf(document, context = {}) {
  return context.referenceNo || document?.parsedData?.referenceNo || document?.referenceNo || '';
}

function matchResult({ duplicateType, status, similarityScore, candidate, warnings = [] }) {
  return createDuplicateResult({
    isDuplicate: true,
    duplicateType,
    status,
    similarityScore,
    matchedDocumentId: candidate.documentId || '',
    matchedRecordId: candidate.recordId || '',
    matchedFilename: candidate.filename || '',
    warnings,
    riskFlags: riskFlagsForDuplicateType(duplicateType)
  });
}

export class DuplicateDetectionService {
  constructor({ repository = new DuplicateRepository(), thresholds = DUPLICATE_THRESHOLDS } = {}) {
    this.repository = repository;
    this.thresholds = thresholds;
  }

  get name() {
    return 'DuplicateDetectionService';
  }

  async detectDuplicate(document, context = {}) {
    const fingerprint = context.fingerprint || document?.fingerprint || {};
    const referenceNo = referenceNoOf(document, context);
    const candidates = await this.repository.findCandidates(context);
    const filteredCandidates = candidates.filter((candidate) => (
      candidate.documentId !== document?.id || candidate.recordId !== context.recordId
    ));

    const exact = filteredCandidates.find((candidate) => (
      (fingerprint.imageHash && candidate.imageHash === fingerprint.imageHash)
      || (fingerprint.md5Hash && candidate.md5Hash === fingerprint.md5Hash)
    ));
    if (exact) {
      return matchResult({
        duplicateType: DUPLICATE_TYPES.EXACT_IMAGE,
        status: DUPLICATE_STATUS.FAIL,
        similarityScore: 1,
        candidate: exact,
        warnings: ['EXACT_DUPLICATE_BLOCK_APPROVAL_REVIEW_REQUIRED']
      });
    }

    const reference = filteredCandidates.find((candidate) => (
      referenceNo && candidate.referenceNo && candidate.referenceNo === referenceNo
    ));
    if (reference) {
      return matchResult({
        duplicateType: DUPLICATE_TYPES.REFERENCE_NO,
        status: DUPLICATE_STATUS.HIGH_RISK,
        similarityScore: 1,
        candidate: reference,
        warnings: ['REFERENCE_NO_ALREADY_USED']
      });
    }

    const similar = filteredCandidates
      .map((candidate) => ({ candidate, similarityScore: maxSimilarity(fingerprint, candidate) }))
      .sort((left, right) => right.similarityScore - left.similarityScore)[0];

    if (similar && similar.similarityScore >= this.thresholds.similar) {
      return matchResult({
        duplicateType: DUPLICATE_TYPES.SIMILAR_IMAGE,
        status: DUPLICATE_STATUS.WARN,
        similarityScore: similar.similarityScore,
        candidate: similar.candidate,
        warnings: ['SIMILAR_DOCUMENT_REVIEW_REQUIRED']
      });
    }

    return createDuplicateResult();
  }

  async saveDocumentFingerprint({ recordId, document, fingerprint, referenceNo }) {
    return this.repository.saveFingerprint({
      recordId,
      documentId: document.id,
      filename: document.filename || document.originalFilename || document.fileName || '',
      referenceNo: referenceNo || document.parsedData?.referenceNo || '',
      imageHash: fingerprint?.imageHash || document.imageHash || '',
      md5Hash: fingerprint?.md5Hash || document.md5Hash || '',
      perceptualHash: fingerprint?.perceptualHash || document.perceptualHash || '',
      averageHash: fingerprint?.averageHash || document.averageHash || '',
      differenceHash: fingerprint?.differenceHash || document.differenceHash || ''
    });
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
