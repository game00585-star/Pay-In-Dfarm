import { ImageBrightness } from './ImageBrightness.js';
import { ImageContrast } from './ImageContrast.js';
import { ImageCropDetector } from './ImageCropDetector.js';
import { ImageDeskew } from './ImageDeskew.js';
import { ImageNoiseReduction } from './ImageNoiseReduction.js';
import { ImageResize } from './ImageResize.js';
import { ImageRotate } from './ImageRotate.js';

function buildOriginalImage(document) {
  return {
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

export class PreprocessingService {
  constructor({ processors } = {}) {
    this.processors = processors || [
      new ImageRotate(),
      new ImageDeskew(),
      new ImageContrast(),
      new ImageBrightness(),
      new ImageNoiseReduction(),
      new ImageResize(),
      new ImageCropDetector()
    ];
  }

  get name() {
    return 'PreprocessingService';
  }

  async preprocess(document, context = {}) {
    const originalImage = buildOriginalImage(document);
    let imageState = {
      originalImage,
      processedImage: {
        ...originalImage,
        processingMode: 'MOCK_PREPROCESSING',
        qualityScore: context.quality?.score || null
      },
      preprocessingLog: [],
      confidence: 100,
      warnings: []
    };

    for (const processor of this.processors) {
      try {
        imageState = await processor.process(imageState, { document, context });
      } catch (error) {
        imageState.preprocessingLog.push({
          operation: processor.operation || processor.name,
          provider: processor.name,
          status: 'FAILED',
          confidence: 0,
          message: error.message
        });
        imageState.warnings.push(`PREPROCESSING_${processor.operation || processor.name}_FAILED`);
      }
    }

    return {
      originalImage: imageState.originalImage,
      processedImage: imageState.processedImage,
      preprocessingLog: imageState.preprocessingLog,
      confidence: Math.max(0, Math.min(100, Number(imageState.confidence || 0))),
      warnings: [...new Set(imageState.warnings)]
    };
  }
}

export const preprocessingService = new PreprocessingService();
