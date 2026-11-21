/** Переместить элемент массива на delta позиций (мутирует). */
export function move<T>(arr: T[], index: number, delta: number): void {
  const j = index + delta;
  if (j < 0 || j >= arr.length) return;
  const [x] = arr.splice(index, 1);
  arr.splice(j, 0, x);
}
