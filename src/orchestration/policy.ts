import { buildRuntimePolicy, type RuntimePolicy, type RuntimePolicyInput } from "../config/runtime-defaults.js";

export function resolveJobPolicy(input: RuntimePolicyInput = {}): RuntimePolicy {
  return buildRuntimePolicy(input);
}
