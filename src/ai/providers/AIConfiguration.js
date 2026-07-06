export const AI_PROVIDERS = Object.freeze({
  MOCK: 'MOCK',
  OLLAMA: 'OLLAMA',
  PADDLEOCR: 'PADDLEOCR',
  OPENCV: 'OPENCV',
  LOCAL: 'LOCAL'
});

export const DEFAULT_AI_CONFIGURATION = Object.freeze({
  visionProvider: AI_PROVIDERS.MOCK,
  ocrProvider: AI_PROVIDERS.MOCK,
  preprocessingProvider: AI_PROVIDERS.OPENCV,
  duplicateProvider: AI_PROVIDERS.LOCAL,
  ollama: {
    baseUrl: 'http://localhost:11434',
    visionModel: 'qwen2.5vl',
    modelName: 'qwen2.5vl',
    timeout: 120000,
    enabled: false
  },
  paddleOCR: {
    paddleOcrEndpoint: 'http://localhost:8000/ocr',
    timeout: 120000,
    language: 'thai+eng',
    enableAngleClassification: true,
    executablePath: '',
    version: 'mock',
    enabled: false
  },
  openCV: {
    openCvEndpoint: 'http://localhost:8001',
    timeout: 120000,
    enableAutoRotate: true,
    enableDeskew: true,
    enableContrast: true,
    enableBrightness: true,
    enableNoiseReduction: true,
    version: 'mock',
    enabled: false
  }
});

export function normalizeAIConfiguration(configuration = {}) {
  return {
    ...DEFAULT_AI_CONFIGURATION,
    ...configuration,
    ollama: { ...DEFAULT_AI_CONFIGURATION.ollama, ...(configuration.ollama || {}) },
    paddleOCR: { ...DEFAULT_AI_CONFIGURATION.paddleOCR, ...(configuration.paddleOCR || {}) },
    openCV: { ...DEFAULT_AI_CONFIGURATION.openCV, ...(configuration.openCV || {}) }
  };
}
