import { MockDatabase, LocalStorageClient } from '../infrastructure/index.js';
import {
  AuditLogRepository,
  BranchRepository,
  MasterDataRepository,
  PayinRepository,
  UserRepository
} from '../repositories/index.js';
import {
  AuditLogService,
  MockOcrProvider,
  PayinService,
  RiskEngineService,
  ValidationEngineService
} from '../services/index.js';

export function createAppServices({ namespace = 'dfarm_sprint1' } = {}) {
  const storageClient = new LocalStorageClient({ namespace });
  const database = new MockDatabase({ storageClient });

  const auditLogRepository = new AuditLogRepository({ database });
  const branchRepository = new BranchRepository({ database });
  const masterDataRepository = new MasterDataRepository({ database });
  const payinRepository = new PayinRepository({ database });
  const userRepository = new UserRepository({ database });

  const auditLogService = new AuditLogService({ auditLogRepository });
  const ocrProvider = new MockOcrProvider();
  const validationEngine = new ValidationEngineService();
  const riskEngine = new RiskEngineService();
  const payinService = new PayinService({
    payinRepository,
    auditLogService,
    riskEngine,
    validationEngine,
    ocrProvider
  });

  return {
    database,
    repositories: {
      auditLogRepository,
      branchRepository,
      masterDataRepository,
      payinRepository,
      userRepository
    },
    services: {
      auditLogService,
      ocrProvider,
      validationEngine,
      riskEngine,
      payinService
    }
  };
}
