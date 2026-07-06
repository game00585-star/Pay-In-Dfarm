const DEFAULT_CONNECTORS = [
  'POS',
  'ERP',
  'SAP',
  'Microsoft Dynamics',
  'Power BI',
  'Microsoft 365',
  'Future Connector'
].map((name) => ({
  connectorId: name.toUpperCase().replaceAll(' ', '_'),
  name,
  enabled: false,
  endpoint: '',
  schedule: 'MANUAL',
  apiVersion: 'v1',
  status: 'CONFIG_REQUIRED',
  updatedAt: ''
}));

export class ConnectorManager {
  constructor({ repository }) {
    this.repository = repository;
  }

  listConnectors() {
    const saved = this.repository.listConnectors();
    return saved.length ? saved : DEFAULT_CONNECTORS;
  }

  saveConnector(connector) {
    const saved = {
      ...connector,
      connectorId: connector.connectorId || connector.name.toUpperCase().replaceAll(' ', '_'),
      updatedAt: new Date().toISOString()
    };
    const next = this.listConnectors().some((item) => item.connectorId === saved.connectorId)
      ? this.listConnectors().map((item) => (item.connectorId === saved.connectorId ? saved : item))
      : [saved, ...this.listConnectors()];
    this.repository.saveConnectors(next);
    return saved;
  }

  setEnabled(connectorId, enabled) {
    const connector = this.listConnectors().find((item) => item.connectorId === connectorId);
    if (!connector) return null;
    return this.saveConnector({ ...connector, enabled, status: enabled ? 'READY' : 'DISABLED' });
  }
}
