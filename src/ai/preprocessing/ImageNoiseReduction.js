import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageNoiseReduction extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageNoiseReduction', operation: 'NOISE_REDUCTION' });
  }
}
