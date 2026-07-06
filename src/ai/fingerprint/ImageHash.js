function hashSeed(input = '', length = 64) {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  const text = String(input);

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB = Math.imul(hashB ^ code, 0x85ebca6b) >>> 0;
  }

  let hex = '';
  while (hex.length < length) {
    hashA = Math.imul(hashA ^ (hashA >>> 13), 0xc2b2ae35) >>> 0;
    hashB = Math.imul(hashB ^ (hashB >>> 16), 0x27d4eb2f) >>> 0;
    hex += hashA.toString(16).padStart(8, '0');
    hex += hashB.toString(16).padStart(8, '0');
  }

  return hex.slice(0, length);
}

export class ImageHash {
  get name() {
    return 'ImageHash';
  }

  async createSHA256Hash(imageSource) {
    return hashSeed(`sha256:${JSON.stringify(imageSource || {})}`, 64);
  }

  async createMD5Hash(imageSource) {
    return hashSeed(`md5:${JSON.stringify(imageSource || {})}`, 32);
  }
}

export function createMockHash(input, length = 64) {
  return hashSeed(input, length);
}
