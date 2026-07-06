function hammingDistance(left = '', right = '') {
  const maxLength = Math.max(left.length, right.length);
  let distance = 0;

  for (let index = 0; index < maxLength; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }

  return distance;
}

export class DuplicateDetector {
  constructor({ similarityThreshold = 0.92 } = {}) {
    this.similarityThreshold = similarityThreshold;
  }

  get name() {
    return 'DuplicateDetector';
  }

  detect(currentFingerprint, candidates = []) {
    if (!candidates.length) {
      return {
        similarityScore: 0,
        duplicateCandidate: null,
        warnings: []
      };
    }

    const scored = candidates.map((candidate) => {
      const candidateHash = candidate.perceptualHash || candidate.imageHash || '';
      const distance = hammingDistance(currentFingerprint.perceptualHash, candidateHash);
      const maxLength = Math.max(currentFingerprint.perceptualHash.length, candidateHash.length, 1);
      return {
        ...candidate,
        similarityScore: Number((1 - distance / maxLength).toFixed(4))
      };
    }).sort((left, right) => right.similarityScore - left.similarityScore);

    const best = scored[0];
    const duplicateCandidate = best?.similarityScore >= this.similarityThreshold ? best : null;

    return {
      similarityScore: best?.similarityScore || 0,
      duplicateCandidate,
      warnings: duplicateCandidate ? ['DUPLICATE_CANDIDATE_DETECTED'] : []
    };
  }
}
