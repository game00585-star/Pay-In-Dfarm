import { dataGovernanceRepository } from './DataGovernanceRepository.js';
import { metadataService } from './MetadataService.js';

export class DataCatalogService {
  constructor({ repository = dataGovernanceRepository } = {}) {
    this.repository = repository;
  }

  buildCatalog(businessRules = []) {
    const metadata = metadataService.ensureDefaults();
    const grouped = Object.values(metadata.reduce((acc, item) => {
      acc[item.entityName] = acc[item.entityName] || {
        catalogId: `CAT-${item.entityName}`,
        entity: item.entityName,
        fields: [],
        owner: item.owner,
        businessRules: []
      };
      acc[item.entityName].fields.push({
        field: item.fieldName,
        dataType: item.dataType,
        description: item.description,
        required: item.required,
        classification: item.classification
      });
      acc[item.entityName].businessRules = businessRules
        .filter((rule) => String(rule.category || rule.appliesTo || '').includes(item.entityName) || String(rule.name || '').includes(item.entityName))
        .map((rule) => rule.ruleCode || rule.code || rule.name);
      return acc;
    }, {}));
    this.repository.replace('catalog', grouped);
    return grouped;
  }

  list() {
    return this.repository.list('catalog');
  }
}

export const dataCatalogService = new DataCatalogService();
