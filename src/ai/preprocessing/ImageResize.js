import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageResize extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageResize', operation: 'RESIZE' });
  }

  async process(imageState) {
    const nextState = await super.process(imageState);
    return {
      ...nextState,
      processedImage: {
        ...nextState.processedImage,
        maxSide: 1600,
        resizeApplied: true
      }
    };
  }
}
