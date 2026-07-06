import { createMockHash } from './ImageHash.js';

function imageSignature(imageSource = {}) {
  return [
    imageSource.storagePath,
    imageSource.imageUrl,
    imageSource.filename,
    imageSource.mimeType,
    imageSource.width,
    imageSource.height,
    imageSource.fileSize,
    imageSource.processingMode
  ].filter((value) => value !== undefined && value !== null).join('|');
}

export class PerceptualHash {
  get name() {
    return 'PerceptualHash';
  }

  async createPerceptualHash(imageSource) {
    return createMockHash(`phash:${imageSignature(imageSource)}`, 16);
  }

  async createAverageHash(imageSource) {
    return createMockHash(`ahash:${imageSignature(imageSource)}`, 16);
  }

  async createDifferenceHash(imageSource) {
    return createMockHash(`dhash:${imageSignature(imageSource)}`, 16);
  }
}
