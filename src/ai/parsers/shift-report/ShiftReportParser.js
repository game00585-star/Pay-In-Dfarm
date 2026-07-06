import { OllamaVisionService } from '../../ollama/OllamaVisionService.js';
import { OpenCVService } from '../../opencv/OpenCVService.js';
import { PaddleOCRService } from '../../paddleocr/PaddleOCRService.js';
import { ShiftReportMapper } from './ShiftReportMapper.js';
import { ShiftReportNormalizer } from './ShiftReportNormalizer.js';
import { ShiftReportPrompt } from './ShiftReportPrompt.js';
import { ShiftReportValidator } from './ShiftReportValidator.js';

function fieldConfidence(fields = {}, base = 92) {
  return Object.fromEntries(Object.keys(fields).map((field, index) => [field, Math.max(65, Math.min(100, base - (index % 4) * 2))]));
}

export class ShiftReportParser {
  constructor({
    configuration,
    openCVService = new OpenCVService({ configuration }),
    paddleOCRService = new PaddleOCRService({ configuration }),
    ollamaVisionService = new OllamaVisionService({ configuration }),
    promptBuilder = new ShiftReportPrompt(),
    mapper = new ShiftReportMapper(),
    normalizer = new ShiftReportNormalizer(),
    validator = new ShiftReportValidator()
  } = {}) {
    this.configuration = configuration;
    this.openCVService = openCVService;
    this.paddleOCRService = paddleOCRService;
    this.ollamaVisionService = ollamaVisionService;
    this.promptBuilder = promptBuilder;
    this.mapper = mapper;
    this.normalizer = normalizer;
    this.validator = validator;
  }

  async parse(image) {
    const startedAt = performance.now();
    const warnings = [];
    const openCV = await this.openCVService.preprocessImage(image);
    warnings.push(...(openCV.warnings || []));
    const ocr = await this.paddleOCRService.extractText(openCV.processedImage || image);
    if (!ocr.success) warnings.push('OCR_OFFLINE');
    const prompt = this.promptBuilder.build({ ocrText: ocr.rawText || '' });
    const ai = await this.ollamaVisionService.analyzeDocument({
      image: openCV.processedImage || image,
      documentType: 'POS_SUMMARY',
      prompt
    });
    warnings.push(...(ai.parsedResult?.warnings || []));
    const mapped = this.mapper.map({ ocrText: ocr.rawText || '', aiFields: ai.parsedResult?.fields || {} });
    const parsedData = this.normalizer.normalize(mapped);
    const confidenceByField = fieldConfidence(parsedData, ai.confidence || (ocr.success ? 92 : 78));
    const validationResult = this.validator.validate(parsedData);
    return {
      documentType: 'POS_SUMMARY',
      confidence: ai.confidence || (ocr.success ? 90 : 70),
      provider: ai.success ? 'OLLAMA' : 'MOCK_AI',
      model: this.configuration?.ollama?.visionModel || this.configuration?.ollama?.modelName || 'qwen2.5vl',
      parsedData,
      fieldConfidence: confidenceByField,
      fieldMapping: this.mapper.fieldMapping({ ocrText: ocr.rawText || '', parsedData, fieldConfidence: confidenceByField }),
      validationResult,
      ocr,
      openCV,
      warnings: [...new Set(warnings)],
      processingTime: Math.round(performance.now() - startedAt)
    };
  }
}

export const shiftReportParser = new ShiftReportParser();
