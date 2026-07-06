export class FingerprintProvider {
  get name() {
    return 'FingerprintProvider';
  }

  async createFingerprint() {
    throw new Error('FingerprintProvider.createFingerprint must be implemented');
  }
}
