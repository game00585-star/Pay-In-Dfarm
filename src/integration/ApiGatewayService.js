function maskKey(value = '') {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '';
}

export class ApiGatewayService {
  constructor({ repository }) {
    this.repository = repository;
  }

  listApiKeys() {
    return this.repository.listApiKeys();
  }

  createApiKey({ name = 'Integration Key', permission = 'READ_ONLY', expiresAt = '' } = {}) {
    const rawKey = `dfarm_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const apiKey = {
      keyId: `key-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      apiVersion: 'v1',
      maskedKey: maskKey(rawKey),
      permission,
      status: 'ACTIVE',
      expiresAt,
      createdAt: new Date().toISOString(),
      rotatedAt: ''
    };
    this.repository.saveApiKeys([apiKey, ...this.repository.listApiKeys()]);
    return apiKey;
  }

  rotateKey(keyId) {
    const keys = this.repository.listApiKeys();
    const next = keys.map((key) => key.keyId === keyId
      ? { ...key, maskedKey: maskKey(`dfarm_${Math.random().toString(36).slice(2)}_${Date.now()}`), rotatedAt: new Date().toISOString() }
      : key);
    this.repository.saveApiKeys(next);
    return next.find((key) => key.keyId === keyId);
  }

  expireKey(keyId) {
    const keys = this.repository.listApiKeys();
    const next = keys.map((key) => key.keyId === keyId ? { ...key, status: 'EXPIRED', expiresAt: new Date().toISOString() } : key);
    this.repository.saveApiKeys(next);
    return next.find((key) => key.keyId === keyId);
  }
}
