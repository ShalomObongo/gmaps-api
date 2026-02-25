import { describe, expect, it } from "vitest";
import { extractPlaceReviews } from "./extract-place-reviews.js";

describe("extractPlaceReviews", () => {
  it("maps sort options and enforces hard maxReviews cap", async () => {
    const seenSortTokens: string[] = [];
    const extracted = await extractPlaceReviews({
      sort: "highest_rating",
      maxReviews: 2,
      fetchReviews: async (token) => {
        seenSortTokens.push(token);
        return [
          { reviewId: "r-1", authorName: "A", rating: "5", text: "Great", publishedAt: "1 day ago" },
          { reviewId: "r-2", authorName: "B", rating: 4.5, text: "Solid", publishedAt: "2 days ago" },
          { reviewId: "r-3", authorName: "C", rating: 4, text: "Ignored", publishedAt: "3 days ago" }
        ];
      }
    });

    expect(seenSortTokens).toEqual(["highest"]);
    expect(extracted).toEqual([
      {
        reviewId: "r-1",
        sortOrder: "highest_rating",
        position: 1,
        authorName: "A",
        rating: 5,
        text: "Great",
        publishedAt: "1 day ago"
      },
      {
        reviewId: "r-2",
        sortOrder: "highest_rating",
        position: 2,
        authorName: "B",
        rating: 4.5,
        text: "Solid",
        publishedAt: "2 days ago"
      }
    ]);
  });

  it("returns partial nullable fields and generated review IDs when selectors miss", async () => {
    const extracted = await extractPlaceReviews({
      sort: "newest",
      maxReviews: 3,
      fetchReviews: async () => [
        {
          reviewId: null,
          authorName: " ",
          rating: "not-a-number",
          text: "",
          publishedAt: null
        }
      ]
    });

    expect(extracted).toHaveLength(1);
    expect(extracted[0]).toMatchObject({
      sortOrder: "newest",
      position: 1,
      authorName: null,
      rating: null,
      text: null,
      publishedAt: null
    });
    expect(extracted[0].reviewId.startsWith("generated-")).toBe(true);
  });

  it("returns empty results when maxReviews is zero", async () => {
    const extracted = await extractPlaceReviews({
      sort: "most_relevant",
      maxReviews: 0,
      fetchReviews: async () => [{ reviewId: "r-1", text: "should not appear" }]
    });

    expect(extracted).toEqual([]);
  });
});
