import { describe, expect, it } from "vitest";
import { normalizePlaceRecord } from "./normalize-place-record.js";

describe("normalizePlaceRecord", () => {
  it("normalizes complete detail input into a stable shape", () => {
    const normalized = normalizePlaceRecord({
      placeId: " pid-1 ",
      name: " Cafe One ",
      category: " Coffee Shop ",
      rating: "4.7",
      reviewsCount: "1,234",
      address: "123 Main St",
      mapsUrl: "https://maps.google.com/?cid=1",
      lat: "47.6097",
      lng: -122.3331,
      website: "https://cafe-one.example",
      email: " contact@cafe-one.example ",
      phone: "+1 206 555 0101",
      openingHoursJson: '["Mon 9-5"]'
    });

    expect(normalized).toEqual({
      placeId: "pid-1",
      name: "Cafe One",
      category: "Coffee Shop",
      rating: 4.7,
      reviewsCount: 1234,
      address: "123 Main St",
      mapsUrl: "https://maps.google.com/?cid=1",
      lat: 47.6097,
      lng: -122.3331,
      website: "https://cafe-one.example",
      email: "contact@cafe-one.example",
      phone: "+1 206 555 0101",
      openingHoursJson: '["Mon 9-5"]'
    });
  });

  it("returns explicit nulls for missing and unparsable optional fields", () => {
    const normalized = normalizePlaceRecord({
      placeId: null,
      name: "Sparse Place",
      category: "",
      rating: "n/a",
      reviewsCount: "not-a-number",
      address: undefined,
      mapsUrl: "",
      lat: "north",
      lng: undefined,
      website: undefined,
      email: "",
      phone: "",
      openingHoursJson: null
    });

    expect(normalized).toEqual({
      placeId: null,
      name: "Sparse Place",
      category: null,
      rating: null,
      reviewsCount: null,
      address: null,
      mapsUrl: null,
      lat: null,
      lng: null,
      website: null,
      email: null,
      phone: null,
      openingHoursJson: null
    });
  });

  it("rejects missing required name", () => {
    expect(() => normalizePlaceRecord({ name: "   " })).toThrow("name is required");
  });
});
