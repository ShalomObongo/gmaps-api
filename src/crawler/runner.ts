import { computeBackoffMs, classifyRetryableError } from "../orchestration/backoff.js";
import { applyPacingDelay } from "../orchestration/pacing.js";
import { buildRunWarnings, type RunWarning } from "../safety/guardrails.js";
import type { RuntimePolicy } from "../config/runtime-defaults.js";

export type RunResult<T> = {
  value: T;
  retries: number;
  warnings: RunWarning[];
};

export async function runWithPolicy<T>(
  task: () => Promise<T>,
  policy: RuntimePolicy,
  options: { random?: () => number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<RunResult<T>> {
  let retries = 0;
  let blockDetected = false;
  const sleep =
    options.sleep ??
    (async (ms: number) => {
      await new Promise<void>((resolve) => setTimeout(resolve, ms));
    });

  while (true) {
    try {
      await applyPacingDelay(policy.pacingMs);
      const value = await task();
      return {
        value,
        retries,
        warnings: buildRunWarnings({ blockDetected, retries, maxRetries: policy.maxRetries })
      };
    } catch (error) {
      const retryable = classifyRetryableError(error);
      if (!retryable || retries >= policy.maxRetries) {
        throw error;
      }

      if (/429|too many requests|blocked|captcha/i.test((error as Error).message)) {
        blockDetected = true;
      }

      const waitMs = computeBackoffMs({
        attempt: retries,
        baseMs: policy.initialBackoffMs,
        maxMs: policy.maxBackoffMs,
        jitterRatio: policy.backoffJitterRatio,
        random: options.random
      });

      retries += 1;
      await sleep(waitMs);
    }
  }
}
