export class ImagePreprocessor {
  constructor({ name = 'ImagePreprocessor', operation = 'UNKNOWN' } = {}) {
    this.providerName = name;
    this.operation = operation;
  }

  get name() {
    return this.providerName;
  }

  async process() {
    throw new Error(`${this.name}.process must be implemented`);
  }
}

export class MockImagePreprocessor extends ImagePreprocessor {
  constructor(options = {}) {
    super(options);
  }

  async process(imageState) {
    return {
      ...imageState,
      processedImage: imageState.processedImage || imageState.originalImage,
      preprocessingLog: [
        ...(imageState.preprocessingLog || []),
        {
          operation: this.operation,
          provider: this.name,
          status: 'COMPLETED',
          confidence: 90,
          message: `${this.operation} prepared by mock preprocessing provider`
        }
      ],
      confidence: Math.min(Number(imageState.confidence || 100), 90),
      warnings: imageState.warnings || []
    };
  }
}
