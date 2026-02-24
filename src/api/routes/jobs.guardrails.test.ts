import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildServer } from "../../server.js";

describe("job guardrails", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("rejects sensitive fields without explicit opt-in", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "plumbers",
        location: "nyc",
        requestedFields: ["reviewAuthor"]
      }
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("allows sensitive fields only when explicitly opted in", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "plumbers",
        location: "nyc",
        includeSensitiveFields: true,
        requestedFields: ["reviewAuthor"]
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().fields).toContain("reviewAuthor");
    await app.close();
  });
});
