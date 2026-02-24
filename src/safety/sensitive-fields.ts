const SENSITIVE_FIELDS = ["reviewAuthor", "reviewAuthorProfile", "reviewAuthorAvatar"];

export const DEFAULT_SAFE_FIELDS = [
  "name",
  "category",
  "rating",
  "reviewsCount",
  "address",
  "coordinates"
];

export type SensitiveFieldResolution = {
  includeSensitiveFields: boolean;
  fields: string[];
};

export function resolveSensitiveFieldPolicy(input: {
  includeSensitiveFields?: boolean;
  requestedFields?: string[];
}): SensitiveFieldResolution {
  const requested = input.requestedFields ?? [];
  const hasSensitiveRequest = requested.some((field) => SENSITIVE_FIELDS.includes(field));

  if (hasSensitiveRequest && !input.includeSensitiveFields) {
    throw new Error("Sensitive fields require includeSensitiveFields=true");
  }

  const includeSensitiveFields = Boolean(input.includeSensitiveFields);
  const fields = includeSensitiveFields
    ? Array.from(new Set([...DEFAULT_SAFE_FIELDS, ...requested]))
    : DEFAULT_SAFE_FIELDS;

  return {
    includeSensitiveFields,
    fields
  };
}
