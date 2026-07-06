import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageCropDetector extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageCropDetector', operation: 'BORDER_AND_CROP_DETECTION' });
  }

  async process(imageState) {
    const nextState = await super.process(imageState);
    return {
      ...nextState,
      processedImage: {
        ...nextState.processedImage,
        borderDetected: true,
        cropDetected: true,
        perspectiveCorrectionReady: true
      }
    };
  }
}
