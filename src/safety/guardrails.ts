export const GUARDRAIL_NOTICE =
  "Local runtime safety baseline active: conservative retry/backoff/pacing, rate limits enabled, and sensitive fields are opt-in.";

export type RunWarning = "BLOCK_DETECTED" | "HIGH_RETRY_RATE";

export function buildRunWarnings(input: { blockDetected?: boolean; retries: number; maxRetries: number }): RunWarning[] {
  const warnings = new Set<RunWarning>();
  if (input.blockDetected) {
    warnings.add("BLOCK_DETECTED");
  }
  if (input.maxRetries > 0 && input.retries / input.maxRetries >= 0.67) {
    warnings.add("HIGH_RETRY_RATE");
  }
  return [...warnings];
}
