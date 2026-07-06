import { dataGovernanceRepository } from './DataGovernanceRepository.js';

export const DATA_CLASSIFICATIONS = Object.freeze(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']);

const DEFAULT_METADATA = [
  { entityName: 'PayinRecord', fieldName: 'id', dataType: 'string', description: 'Pay-in record id', required: true, owner: 'Accounting', classification: 'INTERNAL' },
  { entityName: 'PayinRecord', fieldName: 'branch', dataType: 'string', description: 'Branch name/code', required: true, owner: 'Branch', classification: 'INTERNAL' },
  { entityName: 'PayinRecord', fieldName: 'date', dataType: 'date', description: 'Business date', required: true, owner: 'Branch', classification: 'INTERNAL' },
  { entityName: 'Document', fieldName: 'documentType', dataType: 'string', description: 'Document type', required: true, owner: 'Accounting', classification: 'INTERNAL' },
  { entityName: 'Document', fieldName: 'parsedData', dataType: 'object', description: 'OCR/AI extracted fields', required: false, owner: 'AI Operations', classification: 'CONFIDENTIAL' },
  { entityName: 'MasterBranch', fieldName: 'branchCode', dataType: 'string', description: 'Master branch code', required: true, owner: 'Admin', classification: 'INTERNAL' }
];

export class MetadataService {
  constructor({ repository = dataGovernanceRepository } = {}) {
    this.repository = repository;
  }

  ensureDefaults() {
    if (!this.repository.list('metadata').length) {
      DEFAULT_METADATA.forEach((item) => this.save(item));
    }
    return this.list();
  }

  list() {
    return this.repository.list('metadata');
  }

  save(input = {}) {
    const saved = {
      metadataId: input.metadataId || `MD-${input.entityName || 'Entity'}-${input.fieldName || Date.now()}`.replace(/\s+/g, '-'),
      entityName: input.entityName || '',
      fieldName: input.fieldName || '',
      dataType: input.dataType || 'string',
      description: input.description || '',
      required: input.required === true,
      owner: input.owner || 'Data Owner',
      classification: input.classification || 'INTERNAL',
      createdAt: input.createdAt || new Date().toISOString()
    };
    return this.repository.save('metadata', 'metadataId', saved);
  }
}

export const metadataService = new MetadataService();
