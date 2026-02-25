import { z } from "zod";

const COLLECTION_LIMITS = {
  maxPlaces: { min: 1, max: 500 },
  maxScrollSteps: { min: 0, max: 100 },
  maxViewportPans: { min: 0, max: 25 }
} as const;

const REVIEW_LIMITS = {
  maxReviews: { min: 0, max: 200 }
} as const;

export const collectionControlsSchema = z.object({
  maxPlaces: z.number().int().min(COLLECTION_LIMITS.maxPlaces.min).max(COLLECTION_LIMITS.maxPlaces.max),
  maxScrollSteps: z
    .number()
    .int()
    .min(COLLECTION_LIMITS.maxScrollSteps.min)
    .max(COLLECTION_LIMITS.maxScrollSteps.max)
    .optional(),
  maxViewportPans: z
    .number()
    .int()
    .min(COLLECTION_LIMITS.maxViewportPans.min)
    .max(COLLECTION_LIMITS.maxViewportPans.max)
    .optional()
});

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

export const reviewControlsSchema = z
  .object({
    enabled: z.boolean().optional(),
    sort: z.enum(["newest", "most_relevant", "highest_rating", "lowest_rating"]).optional(),
    maxReviews: z
      .number()
      .int()
      .min(REVIEW_LIMITS.maxReviews.min)
      .max(REVIEW_LIMITS.maxReviews.max)
      .optional()
  })
  .strict()
  .optional();

const sharedJobOptionsSchema = z.object({
  policy: jobPolicySchema,
  includeSensitiveFields: z.boolean().optional(),
  requestedFields: z.array(z.string().min(1)).optional(),
  collection: collectionControlsSchema,
  reviews: reviewControlsSchema
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

export type CollectionControlsInput = z.infer<typeof collectionControlsSchema>;
export type ReviewControlsInput = NonNullable<z.infer<typeof reviewControlsSchema>>;
export type JobInput = z.infer<typeof jobInputSchema>;
