export class ImageQualityProvider {
  get name() {
    return 'ImageQualityProvider';
  }

  async checkQuality() {
    throw new Error('ImageQualityProvider.checkQuality must be implemented');
  }
}

export class MockImageQualityProvider extends ImageQualityProvider {
  get name() {
    return 'MockImageQualityProvider';
  }

  async checkQuality(document) {
    const fileSize = Number(document?.fileSize || 0);
    const mimeType = document?.mimeType || document?.contentType || '';
    return {
      passed: true,
      score: 92,
      confidence: 95,
      checks: {
        readable: true,
        supportedMimeType: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(mimeType),
        fileSizeAccepted: fileSize <= 10 * 1024 * 1024,
        hasStorageReference: Boolean(document?.storagePath || document?.imageUrl || document?.url)
      },
      warnings: []
    };
  }
}
