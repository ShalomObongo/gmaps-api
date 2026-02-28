import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildServer } from "../../server.js";

describe("UI routes", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("serves control center at root", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("gmaps-api Control Center");

    await app.close();
  });

  it("serves control center at /ui", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({ method: "GET", url: "/ui" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Job Monitor");

    await app.close();
  });

  it("returns empty favicon response", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({ method: "GET", url: "/favicon.ico" });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");

    await app.close();
  });
});
