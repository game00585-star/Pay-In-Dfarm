import { OllamaVisionService } from '../../ollama/OllamaVisionService.js';
import { OpenCVService } from '../../opencv/OpenCVService.js';
import { PaddleOCRService } from '../../paddleocr/PaddleOCRService.js';
import { detectBankTemplate } from './BankTemplateRules.js';
import { BankTransferSlipMapper } from './BankTransferSlipMapper.js';
import { BankTransferSlipNormalizer } from './BankTransferSlipNormalizer.js';
import { BankTransferSlipPrompt } from './BankTransferSlipPrompt.js';
import { BankTransferSlipValidator } from './BankTransferSlipValidator.js';

function confidenceByField(fields = {}, base = 88) {
  return Object.fromEntries(Object.keys(fields).map((field, index) => [field, Math.max(60, Math.min(100, base - (index % 5) * 3))]));
}

export class BankTransferSlipParser {
  constructor({
    configuration,
    openCVService = new OpenCVService({ configuration }),
    paddleOCRService = new PaddleOCRService({ configuration }),
    ollamaVisionService = new OllamaVisionService({ configuration }),
    promptBuilder = new BankTransferSlipPrompt(),
    mapper = new BankTransferSlipMapper(),
    normalizer = new BankTransferSlipNormalizer(),
    validator = new BankTransferSlipValidator()
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
    const warnings = [];
    const openCV = await this.openCVService.preprocessImage(image);
    warnings.push(...(openCV.warnings || []));
    const processedImage = openCV.processedImage || image;
    const ocr = await this.paddleOCRService.extractText(processedImage);
    if (!ocr.success) warnings.push('OCR_OFFLINE');
    const template = detectBankTemplate({ filename: context.filename, ocrText: ocr.rawText || '' });
    const prompt = this.promptBuilder.build({
      ocrText: ocr.rawText || '',
      detectedBank: template.detectedBank,
      detectedTemplate: template.detectedTemplate
    });
    const ai = await this.ollamaVisionService.analyzeDocument({
      image: processedImage,
      documentType: 'BANK_TRANSFER_SLIP',
      prompt
    });
    warnings.push(...(ai.parsedResult?.warnings || []));
    const mapped = this.mapper.map({
      filename: context.filename || '',
      ocrText: ocr.rawText || '',
      aiFields: ai.parsedResult?.fields || {}
    });
    const parsedData = this.normalizer.normalize(mapped);
    const detectedBank = parsedData.bankName || mapped.detectedBank || template.detectedBank;
    const detectedTemplate = mapped.detectedTemplate || template.detectedTemplate;
    const confidence = ai.confidence || mapped.templateConfidence || (ocr.success ? 86 : 70);
    const fieldConfidence = confidenceByField(parsedData, confidence);
    const validationResult = this.validator.validate(parsedData, context);
    return {
      documentType: 'BANK_TRANSFER_SLIP',
      detectedBank,
      detectedTemplate,
      confidence,
      provider: ai.success ? 'OLLAMA' : 'MOCK_AI',
      model: this.configuration?.ollama?.visionModel || this.configuration?.ollama?.modelName || 'qwen2.5vl',
      parsedData,
      validationResult,
      warnings: [...new Set([...warnings, ...(validationResult.warnings || [])])],
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

export const bankTransferSlipParser = new BankTransferSlipParser();
