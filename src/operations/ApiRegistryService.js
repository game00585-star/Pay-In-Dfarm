const API_REGISTRY_KEY = 'dfarm_operations_api_registry';

const DEFAULT_APIS = [
  { name: 'Pay-in Records API', version: 'v1', method: 'GET', path: '/api/v1/payin-records', auth: 'API_KEY', status: 'PLANNED' },
  { name: 'Workflow API', version: 'v1', method: 'GET', path: '/api/v1/workflow-cases', auth: 'API_KEY', status: 'PLANNED' },
  { name: 'Branch Report API', version: 'v1', method: 'GET', path: '/api/v1/reports/branches', auth: 'API_KEY', status: 'PLANNED' },
  { name: 'Risk Report API', version: 'v1', method: 'GET', path: '/api/v1/reports/risk', auth: 'API_KEY', status: 'PLANNED' }
];

export class ApiRegistryService {
  listApis() {
    try {
      return JSON.parse(localStorage.getItem(API_REGISTRY_KEY)) || DEFAULT_APIS;
    } catch {
      return DEFAULT_APIS;
    }
  }
}

export const apiRegistryService = new ApiRegistryService();
