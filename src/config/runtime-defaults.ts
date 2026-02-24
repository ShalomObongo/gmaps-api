export type RuntimePolicy = {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffJitterRatio: number;
  pacingMs: number;
  includeSensitiveFields: boolean;
  useProxy: boolean;
  captchaMode: "off" | "optional";
};

export type RuntimePolicyInput = Partial<RuntimePolicy>;

export const RUNTIME_DEFAULTS: RuntimePolicy = {
  maxRetries: 3,
  initialBackoffMs: 800,
  maxBackoffMs: 20_000,
  backoffJitterRatio: 0.2,
  pacingMs: 1_200,
  includeSensitiveFields: false,
  useProxy: false,
  captchaMode: "off"
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildRuntimePolicy(input: RuntimePolicyInput = {}): RuntimePolicy {
  return {
    maxRetries: clamp(input.maxRetries ?? RUNTIME_DEFAULTS.maxRetries, 0, 6),
    initialBackoffMs: clamp(input.initialBackoffMs ?? RUNTIME_DEFAULTS.initialBackoffMs, 100, 60_000),
    maxBackoffMs: clamp(input.maxBackoffMs ?? RUNTIME_DEFAULTS.maxBackoffMs, 1_000, 120_000),
    backoffJitterRatio: clamp(input.backoffJitterRatio ?? RUNTIME_DEFAULTS.backoffJitterRatio, 0, 0.5),
    pacingMs: clamp(input.pacingMs ?? RUNTIME_DEFAULTS.pacingMs, 200, 30_000),
    includeSensitiveFields: input.includeSensitiveFields ?? RUNTIME_DEFAULTS.includeSensitiveFields,
    useProxy: input.useProxy ?? RUNTIME_DEFAULTS.useProxy,
    captchaMode: input.captchaMode ?? RUNTIME_DEFAULTS.captchaMode
  };
}
