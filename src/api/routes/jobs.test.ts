import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildServer } from "../../server.js";

describe("POST /jobs", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("accepts minimal payload and returns queued job with policy", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const dbFile = join(workDir, "local.db");
    const app = await buildServer({ databaseFile: dbFile, logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: { query: "coffee near me" }
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.status).toBe("queued");
    expect(typeof body.jobId).toBe("string");
    expect(body.policy).toMatchObject({
      maxRetries: 3,
      pacingMs: 1200,
      includeSensitiveFields: false
    });

    await app.close();
  });
});
