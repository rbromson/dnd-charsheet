/** Возвращает целое 1..sides */
export type Rng = (sides: number) => number;

export const cryptoRng: Rng = (sides) => {
  if (sides <= 1) return 1;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / sides) * sides;
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return (x % sides) + 1;
};

/** Детерминированный rng для тестов: отдаёт значения по очереди. */
export function seqRng(values: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('seqRng exhausted');
    return values[i++];
  };
}
