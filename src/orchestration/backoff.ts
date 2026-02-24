export function classifyRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|temporarily unavailable|429|too many requests|net::err|econnreset|socket hang up/i.test(message);
}

export function computeBackoffMs(input: {
  attempt: number;
  baseMs: number;
  maxMs: number;
  jitterRatio: number;
  random?: () => number;
}): number {
  const random = input.random ?? Math.random;
  const exp = Math.min(input.maxMs, input.baseMs * 2 ** input.attempt);
  const jitterRange = Math.floor(exp * input.jitterRatio);
  const jitter = Math.floor((random() * 2 - 1) * jitterRange);
  return Math.max(0, exp + jitter);
}
