import { OpenCVHealthService } from './OpenCVHealthService.js';
import { OpenCVImageQualityService } from './OpenCVImageQualityService.js';
import { OpenCVPreprocessingService } from './OpenCVPreprocessingService.js';

export class OpenCVService {
  constructor({ configuration } = {}) {
    this.configuration = configuration;
    this.healthService = new OpenCVHealthService({ configuration });
    this.qualityService = new OpenCVImageQualityService({ configuration });
    this.preprocessingService = new OpenCVPreprocessingService({ configuration });
  }

  healthCheck() {
    return this.healthService.healthCheck();
  }

  analyzeQuality(image) {
    return this.qualityService.analyzeQuality(image);
  }

  preprocessImage(image) {
    return this.preprocessingService.preprocessImage(image);
  }
}
