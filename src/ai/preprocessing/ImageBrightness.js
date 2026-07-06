import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageBrightness extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageBrightness', operation: 'AUTO_BRIGHTNESS' });
  }
}
