import Fastify, { type FastifyInstance } from "fastify";
import { loadEnv } from "./config/env.js";
import { RUNTIME_DEFAULTS } from "./config/runtime-defaults.js";
import { createDatabase } from "./storage/db.js";
import { createJobsRepo } from "./storage/jobs-repo.js";
import { createPlacesRepo } from "./storage/places-repo.js";
import { createPlaceReviewsRepo } from "./storage/place-reviews-repo.js";
import { registerRateLimitPlugin } from "./api/plugins/rate-limit.js";
import { registerJobRoutes } from "./api/routes/jobs.js";
import { registerJobStatusRoutes } from "./api/routes/job-status.js";
import { registerJobResultsRoutes } from "./api/routes/job-results.js";
import { registerJobExportsRoutes } from "./api/routes/job-exports.js";
import { registerUiRoutes } from "./api/routes/ui.js";
import { GUARDRAIL_NOTICE } from "./safety/guardrails.js";
import { createJobsWorker, type WorkerExecuteJob } from "./orchestration/runner/jobs-worker.js";

export type BuildServerOptions = {
  databaseFile?: string;
  logger?: boolean;
  workerPollIntervalMs?: number;
  workerHeartbeatIntervalMs?: number;
  workerExecuteJob?: WorkerExecuteJob;
};

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const env = loadEnv();
  const app = Fastify({ logger: options.logger ?? true });
  const db = createDatabase(options.databaseFile ?? env.DATABASE_FILE);
  const jobsRepo = createJobsRepo(db);
  const placesRepo = createPlacesRepo(db);
  const placeReviewsRepo = createPlaceReviewsRepo(db);
  const worker = createJobsWorker({
    jobsRepo,
    placesRepo,
    placeReviewsRepo,
    pollIntervalMs: options.workerPollIntervalMs,
    heartbeatIntervalMs: options.workerHeartbeatIntervalMs,
    executeJob: options.workerExecuteJob
  });

  app.addHook("onClose", async () => {
    await worker.stop();
    db.close();
  });

  await registerRateLimitPlugin(app);
  await registerUiRoutes(app);
  await registerJobRoutes(app, jobsRepo);
  await registerJobStatusRoutes(app, jobsRepo);
  await registerJobResultsRoutes(app, jobsRepo, placesRepo, placeReviewsRepo);
  await registerJobExportsRoutes(app, jobsRepo, placesRepo, placeReviewsRepo);
  worker.start();

  app.get("/health", async () => ({ ok: true, notice: GUARDRAIL_NOTICE }));

  return app;
}

export function startupBanner(): string {
  return [
    "gmaps-api local runtime safety baseline",
    "- local-only defaults active",
    "- paid proxy/captcha integrations are optional and disabled by default",
    `- default runtime policy: ${JSON.stringify(RUNTIME_DEFAULTS)}`,
    `- guardrails: ${GUARDRAIL_NOTICE}`
  ].join("\n");
}

async function runCli(): Promise<void> {
  const env = loadEnv();
  const checkOnly = process.argv.includes("--check");
  const app = await buildServer({ logger: !checkOnly });

  if (checkOnly) {
    await app.ready();
    console.log(startupBanner());
    await app.close();
    return;
  }

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(startupBanner());
}

const mainPath = process.argv[1] ?? "";
if (mainPath.endsWith("server.js")) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
