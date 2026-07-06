export class IntegrationScheduler {
  constructor({ integrationEngine, connectorManager }) {
    this.integrationEngine = integrationEngine;
    this.connectorManager = connectorManager;
  }

  listSchedules() {
    return this.connectorManager.listConnectors().map((connector) => ({
      connectorId: connector.connectorId,
      name: connector.name,
      schedule: connector.schedule || 'MANUAL',
      enabled: connector.enabled,
      nextRunAt: connector.enabled && connector.schedule !== 'MANUAL' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : ''
    }));
  }

  runManual(connector) {
    return this.integrationEngine.createJob({
      integrationType: 'SCHEDULED_SYNC',
      sourceSystem: 'Financial Platform',
      destinationSystem: connector.name
    });
  }
}
