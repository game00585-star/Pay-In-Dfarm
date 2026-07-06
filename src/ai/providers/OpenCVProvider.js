import { OpenCVService } from '../opencv/OpenCVService.js';

export class OpenCVProvider {
  constructor({ configuration = {} } = {}) {
    this.configuration = configuration;
    this.service = new OpenCVService({ configuration });
  }

  get name() {
    return 'OPENCV';
  }

  async preprocessImage(image) {
    const result = await this.service.preprocessImage(image);
    return {
      provider: this.name,
      ...result
    };
  }

  async preprocess(document) {
    const image = document?.previewUrl || document?.imageUrl || document?.url || document?.storagePath || '';
    const result = await this.preprocessImage(image);
    return {
      originalImage: result.originalImage || image,
      processedImage: result.processedImage || image,
      preprocessingLog: result.preprocessingLog || [],
      confidence: result.confidence || 0,
      warnings: result.warnings || []
    };
  }

  async checkQuality(document) {
    const image = document?.previewUrl || document?.imageUrl || document?.url || document?.storagePath || '';
    const result = await this.service.analyzeQuality(image);
    return {
      passed: result.status !== 'FAIL',
      score: result.qualityScore,
      confidence: result.qualityScore,
      checks: result,
      warnings: result.warnings || []
    };
  }

  async compareFingerprint(left, right) {
    return {
      provider: this.name,
      similarityScore: left?.imageHash && left.imageHash === right?.imageHash ? 1 : 0,
      warnings: ['OPENCV_COMPARE_MOCK_MODE']
    };
  }

  async healthCheck() {
    const result = await this.service.healthCheck();
    return {
      provider: this.name,
      status: result.status,
      version: result.version,
      modelName: 'opencv-local',
      responseTimeMs: result.responseTime,
      endpoint: result.endpoint,
      message: result.error || 'Local OpenCV health check completed'
    };
  }
}
