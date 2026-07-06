import { PARSER_STATUS } from '../constants/statuses.js';

/**
 * @typedef {Object} PayinDocument
 * @property {string} documentType
 * @property {string} documentTemplate
 * @property {string} templateVersion
 * @property {string} url
 * @property {string} imageHash
 * @property {string} uploadedAt
 * @property {string} parserStatus
 * @property {number} parserConfidence
 * @property {Object} fields
 */

export function createPayinDocument(input = {}) {
  return {
    documentType: input.documentType || '',
    documentTemplate: input.documentTemplate || '',
    templateVersion: input.templateVersion || 'v1',
    url: input.url || '',
    imageHash: input.imageHash || '',
    uploadedAt: input.uploadedAt || '',
    parserStatus: input.parserStatus || PARSER_STATUS.PENDING,
    parserConfidence: input.parserConfidence || 0,
    fields: input.fields || {}
  };
}

