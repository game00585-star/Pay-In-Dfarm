import { OpenCVClient } from './OpenCVClient.js';
import { OpenCVHealthService } from './OpenCVHealthService.js';
import { OpenCVResponseParser } from './OpenCVResponseParser.js';

function stripDataUrl(value = '') {
  return String(value || '').replace(/^data:[^;]+;base64,/, '');
}

function mockPreprocess(image, reason = 'OPENCV_FALLBACK_MOCK_PREPROCESS') {
  return {
    success: false,
    originalImage: image,
    processedImage: image,
    preprocessingLog: [
      { operation: 'AUTO_ROTATE', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'DESKEW', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'RESIZE', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'CONTRAST_ENHANCEMENT', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'BRIGHTNESS_CORRECTION', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'NOISE_REDUCTION', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'BORDER_DETECTION', status: 'SKIPPED', provider: 'MOCK_OPENCV' },
      { operation: 'PERSPECTIVE_CORRECTION', status: 'SKIPPED', provider: 'MOCK_OPENCV' }
    ],
    confidence: 80,
    warnings: [reason]
  };
}

export class OpenCVPreprocessingService {
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

  async preprocessImage(image) {
    const health = await this.healthService.healthCheck();
    if (health.status !== 'READY') return mockPreprocess(image, health.status || 'OPENCV_UNAVAILABLE');
    try {
      const raw = await this.client.preprocess({
        imageBase64: stripDataUrl(image),
        options: {
          enableAutoRotate: this.configuration?.openCV?.enableAutoRotate ?? true,
          enableDeskew: this.configuration?.openCV?.enableDeskew ?? true,
          enableContrast: this.configuration?.openCV?.enableContrast ?? true,
          enableBrightness: this.configuration?.openCV?.enableBrightness ?? true,
          enableNoiseReduction: this.configuration?.openCV?.enableNoiseReduction ?? true
        }
      });
      return this.parser.parsePreprocess(raw);
    } catch (error) {
      return mockPreprocess(image, error.message);
    }
  }
}
