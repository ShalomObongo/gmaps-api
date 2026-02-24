import { z } from "zod";

export const jobPolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(6).optional(),
  initialBackoffMs: z.number().int().min(100).max(60_000).optional(),
  maxBackoffMs: z.number().int().min(1_000).max(120_000).optional(),
  backoffJitterRatio: z.number().min(0).max(0.5).optional(),
  pacingMs: z.number().int().min(200).max(30_000).optional(),
  includeSensitiveFields: z.boolean().optional(),
  useProxy: z.boolean().optional(),
  captchaMode: z.enum(["off", "optional"]).optional()
}).optional();

const sharedJobOptionsSchema = z.object({
  policy: jobPolicySchema,
  includeSensitiveFields: z.boolean().optional(),
  requestedFields: z.array(z.string().min(1)).optional()
});

const keywordLocationInputSchema = sharedJobOptionsSchema.extend({
  inputType: z.literal("keyword_location"),
  query: z.string().min(1),
  location: z.string().min(1)
}).strict();

const mapsUrlInputSchema = sharedJobOptionsSchema.extend({
  inputType: z.literal("maps_url"),
  mapsUrl: z.url()
}).strict();

const placeIdInputSchema = sharedJobOptionsSchema.extend({
  inputType: z.literal("place_id"),
  placeId: z.string().min(1)
}).strict();

export const jobInputSchema = z.discriminatedUnion("inputType", [
  keywordLocationInputSchema,
  mapsUrlInputSchema,
  placeIdInputSchema
]);

export type JobInput = z.infer<typeof jobInputSchema>;
