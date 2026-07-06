import { MockDocumentClassifier } from '../classification/DocumentClassifier.js';
import { DuplicateDetectionService } from '../duplicate/DuplicateDetectionService.js';
import { FingerprintService } from '../fingerprint/FingerprintService.js';
import { MockNormalizationProvider } from '../normalization/NormalizationProvider.js';
import { MockOCRProvider } from '../ocr/OCRProvider.js';
import { OpenCVProvider } from '../providers/OpenCVProvider.js';
import { PaddleOCRProvider } from '../providers/PaddleOCRProvider.js';
import { PreprocessingService } from '../preprocessing/PreprocessingService.js';
import { MockImageQualityProvider } from '../quality/ImageQualityProvider.js';
import { MockRiskEngineProvider } from '../risk/RiskEngineProvider.js';
import { MockValidationProvider } from '../validation/ValidationProvider.js';
import { PIPELINE_STEPS, PROCESSING_STATUS } from './processingStatus.js';
import { PipelineProvider } from './PipelineProvider.js';
import { createPipelineResult, serializeError } from './result.js';
import { runWithRetry } from './retry.js';

function defaultProviders() {
  return {
    qualityProvider: new MockImageQualityProvider(),
    preprocessingProvider: new PreprocessingService(),
    openCVProvider: new OpenCVProvider(),
    fingerprintProvider: new FingerprintService(),
    duplicateDetectionProvider: new DuplicateDetectionService(),
    classifier: new MockDocumentClassifier(),
    ocrProvider: new MockOCRProvider(),
    paddleOCRProvider: new PaddleOCRProvider(),
    normalizationProvider: new MockNormalizationProvider(),
    validationProvider: new MockValidationProvider(),
    riskEngineProvider: new MockRiskEngineProvider()
  };
}

export class DocumentProcessingPipeline extends PipelineProvider {
  constructor({ providers = {}, retry = {} } = {}) {
    super();
    this.providers = { ...defaultProviders(), ...providers };
    this.retry = {
      maxRetries: 1,
      ...retry
    };
  }

  get name() {
    return 'DocumentProcessingPipeline';
  }

  getOCRProvider(context = {}) {
    if (context.aiConfiguration?.ocrProvider === 'PADDLEOCR') {
      return this.providers.paddleOCRProvider || this.providers.ocrProvider;
    }
    return this.providers.ocrProvider;
  }

  getPreprocessingProvider(context = {}) {
    if (context.aiConfiguration?.preprocessingProvider === 'OPENCV') {
      return this.providers.openCVProvider || this.providers.preprocessingProvider;
    }
    return this.providers.preprocessingProvider;
  }

  async runStep({ pipelineResult, key, step, provider, action }) {
    const stepResult = await runWithRetry({
      step,
      providerName: provider.name,
      maxRetries: this.retry.maxRetries,
      action
    });
    pipelineResult.steps[key] = stepResult;
    if (stepResult.status === PROCESSING_STATUS.FAILED) {
      throw new Error(`${step} failed: ${stepResult.error?.message || 'unknown error'}`);
    }
    return stepResult.data;
  }

  async processDocument(document, context = {}) {
    const pipelineResult = createPipelineResult({ document, status: PROCESSING_STATUS.PROCESSING });

    try {
      const quality = await this.runStep({
        pipelineResult,
        key: 'quality',
        step: PIPELINE_STEPS.IMAGE_QUALITY,
        provider: this.providers.qualityProvider,
        action: () => this.providers.qualityProvider.checkQuality(document, context)
      });
      pipelineResult.result.quality = quality;

      const activePreprocessingProvider = this.getPreprocessingProvider(context);
      const preprocessing = await this.runStep({
        pipelineResult,
        key: 'preprocessing',
        step: PIPELINE_STEPS.IMAGE_PREPROCESSING,
        provider: activePreprocessingProvider,
        action: () => activePreprocessingProvider.preprocess(document, { ...context, quality })
      });
      pipelineResult.result.preprocessing = preprocessing;

      const fingerprint = await this.runStep({
        pipelineResult,
        key: 'fingerprint',
        step: PIPELINE_STEPS.IMAGE_FINGERPRINT,
        provider: this.providers.fingerprintProvider,
        action: () => this.providers.fingerprintProvider.createFingerprint(document, { ...context, quality, preprocessing })
      });
      pipelineResult.result.fingerprint = fingerprint;

      const duplicate = await this.runStep({
        pipelineResult,
        key: 'duplicate',
        step: PIPELINE_STEPS.DUPLICATE_DETECTION,
        provider: this.providers.duplicateDetectionProvider,
        action: () => this.providers.duplicateDetectionProvider.detectDuplicate(document, { ...context, quality, preprocessing, fingerprint })
      });
      pipelineResult.result.duplicate = duplicate;

      const classification = await this.runStep({
        pipelineResult,
        key: 'classification',
        step: PIPELINE_STEPS.DOCUMENT_CLASSIFICATION,
        provider: this.providers.classifier,
        action: () => this.providers.classifier.classify(document, { ...context, quality, preprocessing, fingerprint, duplicate })
      });
      pipelineResult.result.classification = classification;

      const activeOCRProvider = this.getOCRProvider(context);
      const ocr = await this.runStep({
        pipelineResult,
        key: 'ocr',
        step: PIPELINE_STEPS.OCR,
        provider: activeOCRProvider,
        action: () => activeOCRProvider.extract(document, { ...context, quality, preprocessing, fingerprint, duplicate, classification })
      });
      pipelineResult.result.ocr = ocr;

      const normalizedData = await this.runStep({
        pipelineResult,
        key: 'normalization',
        step: PIPELINE_STEPS.NORMALIZATION,
        provider: this.providers.normalizationProvider,
        action: () => this.providers.normalizationProvider.normalize(ocr, { ...context, quality, preprocessing, fingerprint, classification })
      });
      pipelineResult.result.normalizedData = normalizedData;

      const validation = await this.runStep({
        pipelineResult,
        key: 'validation',
        step: PIPELINE_STEPS.VALIDATION,
        provider: this.providers.validationProvider,
        action: () => this.providers.validationProvider.validate(normalizedData, { ...context, document, quality, classification, ocr })
      });
      pipelineResult.result.validation = validation;

      const risk = await this.runStep({
        pipelineResult,
        key: 'risk',
        step: PIPELINE_STEPS.RISK_SCORE,
        provider: this.providers.riskEngineProvider,
        action: () => this.providers.riskEngineProvider.evaluate(validation, { ...context, document, normalizedData, duplicate })
      });
      pipelineResult.result.risk = risk;

      pipelineResult.status = PROCESSING_STATUS.COMPLETED;
      pipelineResult.completedAt = new Date().toISOString();
      return pipelineResult;
    } catch (error) {
      pipelineResult.status = PROCESSING_STATUS.FAILED;
      pipelineResult.completedAt = new Date().toISOString();
      pipelineResult.error = serializeError(error);
      return pipelineResult;
    }
  }
}

const defaultPipeline = new DocumentProcessingPipeline();

export async function processDocument(document, context = {}) {
  return defaultPipeline.processDocument(document, context);
}
