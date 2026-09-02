/**
 * parseInt(x) || fallback trata 0 como "ausente" e substitui pelo fallback —
 * errado para campos onde 0 é um valor válido (ex: potes enviados, quando o
 * produto não chegou a ser entregue). Esta função só cai no fallback quando
 * o valor realmente não foi enviado ou não é um número.
 */
export function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}
