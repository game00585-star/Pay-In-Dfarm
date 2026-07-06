import { DuplicateDetector } from './DuplicateDetector.js';
import { ImageHash } from './ImageHash.js';
import { PerceptualHash } from './PerceptualHash.js';
import { FingerprintProvider } from './FingerprintProvider.js';

function pickImageSource(document, context = {}) {
  return context.preprocessing?.processedImage || {
    id: document?.id || '',
    filename: document?.filename || document?.originalFilename || document?.fileName || '',
    mimeType: document?.mimeType || document?.contentType || '',
    fileSize: Number(document?.fileSize || 0),
    width: Number(document?.width || 0),
    height: Number(document?.height || 0),
    imageUrl: document?.imageUrl || document?.url || '',
    storagePath: document?.storagePath || ''
  };
}

export class FingerprintService extends FingerprintProvider {
  constructor({
    imageHash = new ImageHash(),
    perceptualHash = new PerceptualHash(),
    duplicateDetector = new DuplicateDetector()
  } = {}) {
    super();
    this.imageHash = imageHash;
    this.perceptualHash = perceptualHash;
    this.duplicateDetector = duplicateDetector;
  }

  get name() {
    return 'FingerprintService';
  }

  async createFingerprint(document, context = {}) {
    const imageSource = pickImageSource(document, context);
    const imageHash = await this.imageHash.createSHA256Hash(imageSource);
    const md5Hash = await this.imageHash.createMD5Hash(imageSource);
    const perceptualHash = await this.perceptualHash.createPerceptualHash(imageSource);
    const averageHash = await this.perceptualHash.createAverageHash(imageSource);
    const differenceHash = await this.perceptualHash.createDifferenceHash(imageSource);
    const duplicateResult = this.duplicateDetector.detect(
      { imageHash, perceptualHash, averageHash, differenceHash },
      context.duplicateCandidates || []
    );

    return {
      imageHash,
      md5Hash,
      perceptualHash,
      averageHash,
      differenceHash,
      similarityScore: duplicateResult.similarityScore,
      duplicateCandidate: duplicateResult.duplicateCandidate,
      warnings: duplicateResult.warnings
    };
  }
}

export const fingerprintService = new FingerprintService();
