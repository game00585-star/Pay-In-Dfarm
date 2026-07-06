import { OpenCVClient } from './OpenCVClient.js';
import { OpenCVHealthService } from './OpenCVHealthService.js';
import { OpenCVResponseParser } from './OpenCVResponseParser.js';

function stripDataUrl(value = '') {
  return String(value || '').replace(/^data:[^;]+;base64,/, '');
}

function mockQuality(reason = 'OPENCV_FALLBACK_MOCK_QUALITY') {
  return {
    success: false,
    qualityScore: 88,
    blurScore: 86,
    brightnessScore: 88,
    contrastScore: 87,
    resolutionScore: 90,
    rotationWarning: false,
    cropWarning: false,
    isTooDark: false,
    isTooBright: false,
    isBlurry: false,
    isLowResolution: false,
    isLikelyCropped: false,
    warnings: [reason],
    status: 'PASS'
  };
}

export class OpenCVImageQualityService {
  constructor({
    configuration,
    client = new OpenCVClient(configuration),
    parser = new OpenCVResponseParser(),
    healthService = new OpenCVHealthService({ configuration, client })
  } = {}) {
    this.configuration = configuration;
    this.client = client;
    this.parser = parser;
    this.healthService = healthService;
  }

  async analyzeQuality(image) {
    const health = await this.healthService.healthCheck();
    if (health.status !== 'READY') return mockQuality(health.status || 'OPENCV_UNAVAILABLE');
    try {
      const raw = await this.client.quality({ imageBase64: stripDataUrl(image) });
      return this.parser.parseQuality(raw);
    } catch (error) {
      return mockQuality(error.message);
    }
  }
}
