export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const x = a[index]!;
    const y = b[index]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function meanVector(vectors: readonly (readonly number[])[]): number[] {
  if (vectors.length === 0) return [];
  const dimension = vectors[0]!.length;
  const sum = new Array<number>(dimension).fill(0);
  for (const vector of vectors) {
    for (let index = 0; index < dimension; index += 1) {
      sum[index]! += vector[index] ?? 0;
    }
  }
  return sum.map((value) => value / vectors.length);
}

export interface ClusterResult {
  clusters: { members: number[]; centroid: number[] }[];
  assignments: number[];
}

/**
 * Deterministic agglomerative clustering (average linkage on cosine distance). The result depends
 * only on the input order and the threshold, which keeps job retries reproducible.
 */
export function agglomerativeCluster(
  vectors: readonly (readonly number[])[],
  options: { similarityThreshold?: number; targetClusterCount?: number; maxClusters?: number } = {},
): ClusterResult {
  const threshold = options.similarityThreshold ?? 0.72;
  const n = vectors.length;
  if (n === 0) {
    return { clusters: [], assignments: [] };
  }
  let clusters: number[][] = vectors.map((_, index) => [index]);
  const similarity = (a: number[], b: number[]): number => {
    let total = 0;
    for (const i of a) for (const j of b) total += cosineSimilarity(vectors[i]!, vectors[j]!);
    return total / (a.length * b.length);
  };

  const target = options.targetClusterCount ?? 1;
  const maxClusters = options.maxClusters ?? n;
  while (clusters.length > target) {
    let best = { i: -1, j: -1, score: -Infinity };
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const score = similarity(clusters[i]!, clusters[j]!);
        if (score > best.score) {
          best = { i, j, score };
        }
      }
    }
    const mustMerge = clusters.length > maxClusters || (options.targetClusterCount !== undefined && clusters.length > target);
    if (best.i < 0 || (!mustMerge && best.score < threshold)) {
      break;
    }
    const merged = [...clusters[best.i]!, ...clusters[best.j]!].sort((a, b) => a - b);
    clusters = clusters.filter((_, index) => index !== best.i && index !== best.j);
    clusters.push(merged);
    clusters.sort((a, b) => a[0]! - b[0]!);
  }

  const assignments = new Array<number>(n).fill(-1);
  const result = clusters.map((members, clusterIndex) => {
    for (const member of members) assignments[member] = clusterIndex;
    return { members, centroid: meanVector(members.map((m) => vectors[m]!)) };
  });
  return { clusters: result, assignments };
}
