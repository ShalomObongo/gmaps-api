import type { FastifyInstance } from "fastify";
import { renderConsolePage } from "../../ui/console-page.js";

export async function registerUiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/favicon.ico", async (_request, reply) => {
    return reply.code(204).send();
  });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderConsolePage());
  });

  app.get("/ui", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderConsolePage());
  });
}
