import { OllamaVisionService } from '../../ollama/OllamaVisionService.js';
import { OpenCVService } from '../../opencv/OpenCVService.js';
import { PaddleOCRService } from '../../paddleocr/PaddleOCRService.js';
import { PayInMapper } from './PayInMapper.js';
import { PayInNormalizer } from './PayInNormalizer.js';
import { PayInPrompt } from './PayInPrompt.js';
import { PayInValidator } from './PayInValidator.js';

function confidenceByField(fields = {}, base = 86) {
  return Object.fromEntries(Object.keys(fields).map((field, index) => [field, Math.max(60, Math.min(100, base - (index % 5) * 3))]));
}

export class PayInParser {
  constructor({
    configuration,
    openCVService = new OpenCVService({ configuration }),
    paddleOCRService = new PaddleOCRService({ configuration }),
    ollamaVisionService = new OllamaVisionService({ configuration }),
    promptBuilder = new PayInPrompt(),
    mapper = new PayInMapper(),
    normalizer = new PayInNormalizer(),
    validator = new PayInValidator()
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

  async parse(image, context = {}) {
    const startedAt = performance.now();
    const documentType = context.documentType || 'PAYIN_BANK_COUNTER';
    const warnings = [];
    const openCV = await this.openCVService.preprocessImage(image);
    warnings.push(...(openCV.warnings || []));
    const processedImage = openCV.processedImage || image;
    const ocr = await this.paddleOCRService.extractText(processedImage);
    if (!ocr.success) warnings.push('OCR_OFFLINE');
    const prompt = this.promptBuilder.build({ ocrText: ocr.rawText || '', documentType });
    const ai = await this.ollamaVisionService.analyzeDocument({ image: processedImage, documentType, prompt });
    warnings.push(...(ai.parsedResult?.warnings || []));
    const mapped = this.mapper.map({ ocrText: ocr.rawText || '', aiFields: ai.parsedResult?.fields || {}, documentType });
    const parsedData = this.normalizer.normalize(mapped);
    const confidence = ai.confidence || (ocr.success ? 84 : 70);
    const fieldConfidence = confidenceByField(parsedData, confidence);
    const validationResult = this.validator.validate(parsedData, context);
    return {
      documentType,
      confidence,
      provider: ai.success ? 'OLLAMA' : 'MOCK_AI',
      model: this.configuration?.ollama?.visionModel || this.configuration?.ollama?.modelName || 'qwen2.5vl',
      parsedData,
      validationResult,
      warnings: [...new Set(warnings)],
      riskFlags: validationResult.flags || [],
      rawText: ocr.rawText || '',
      textBlocks: ocr.textBlocks || [],
      fieldConfidence,
      fieldMapping: this.mapper.fieldMapping({ ocrText: ocr.rawText || '', parsedData, fieldConfidence }),
      openCV,
      ocr,
      processingTime: Math.round(performance.now() - startedAt)
    };
  }
}

export const payInParser = new PayInParser();
