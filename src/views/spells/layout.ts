/**
 * Делит упорядоченный список весов на k подряд идущих групп так,
 * чтобы самая тяжёлая группа была как можно легче (порядок сохраняется).
 * Всегда возвращает ровно k групп индексов (лишние — пустые, в конце).
 */
export function splitBalanced(weights: number[], k = 3): number[][] {
  const n = weights.length;
  const groups: number[][] = Array.from({ length: k }, () => []);
  if (n === 0 || k <= 0) return groups;
  if (n <= k) {
    weights.forEach((_, i) => groups[i].push(i));
    return groups;
  }
  const prefix = [0];
  for (const w of weights) prefix.push(prefix[prefix.length - 1] + w);
  const sum = (a: number, b: number) => prefix[b] - prefix[a];

  // best[j][i] — минимальный максимум для первых i элементов в j группах
  const best: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const cut: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(0));
  best[0][0] = 0;
  for (let j = 1; j <= k; j++) {
    for (let i = 1; i <= n; i++) {
      for (let p = j - 1; p < i; p++) {
        const v = Math.max(best[j - 1][p], sum(p, i));
        if (v < best[j][i]) {
          best[j][i] = v;
          cut[j][i] = p;
        }
      }
    }
  }
  let end = n;
  for (let j = k; j >= 1; j--) {
    const start = cut[j][end];
    for (let i = start; i < end; i++) groups[j - 1].push(i);
    end = start;
  }
  return groups;
}
