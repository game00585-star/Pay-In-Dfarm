import { PAYIN_STATUS } from '../constants/statuses.js';

/**
 * @typedef {Object} PayinRecord
 * @property {string} id
 * @property {string} date
 * @property {string} branch
 * @property {string} shift
 * @property {number} expectedAmount
 * @property {number} branchAmount
 * @property {number} transferSlipAmount
 * @property {Object<string, string>} documentUrls
 * @property {Object<string, string>} imageHashes
 * @property {Object<string, Object>} aiDocuments
 * @property {Object<string, Object>} comparisons
 * @property {number} riskScore
 * @property {string[]} riskFlags
 * @property {string} status
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} reviewedBy
 * @property {string} reviewedAt
 * @property {Object} timeline
 * @property {string} accountingComment
 */

export function createPayinRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || `PAY-${now.slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`,
    date: input.date || now.slice(0, 10),
    branch: input.branch || '',
    shift: input.shift || '',
    expectedAmount: Number(input.expectedAmount || 0),
    branchAmount: Number(input.branchAmount || 0),
    transferSlipAmount: Number(input.transferSlipAmount || 0),
    documentUrls: input.documentUrls || {},
    imageHashes: input.imageHashes || {},
    aiDocuments: input.aiDocuments || {},
    comparisons: input.comparisons || {},
    riskScore: Number(input.riskScore || 0),
    riskFlags: input.riskFlags || [],
    status: input.status || PAYIN_STATUS.DRAFT,
    createdBy: input.createdBy || '',
    createdAt: input.createdAt || now,
    reviewedBy: input.reviewedBy || '',
    reviewedAt: input.reviewedAt || '',
    timeline: input.timeline || { createdAt: now },
    accountingComment: input.accountingComment || ''
  };
}

