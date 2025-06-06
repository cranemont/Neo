import { publicProcedure, router } from './trpc.js';
import { z } from 'zod';
import { UserInput } from './codegen/UserInput.js';
import { explore } from './explore.js';

export const appRouter = router({
  explore: publicProcedure
    .input(
      z.object({
        maxAttempts: z.number().default(50),
        scenario: z.string(),
        baseUrl: z.string(),
        inputs: z
          .array(
            z.object({
              key: z.string(),
              value: z.string(),
              description: z.string().optional(),
            }),
          )
          .transform((inputs) => inputs.map((input) => UserInput.of(input.key, input.value, input.description ?? ''))),
        apiKey: z.string(),
        domainContext: z.array(z.string()).default([]),
        precondition: z.string().optional(),
        browserOptions: z
          .object({
            browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
            headless: z.boolean().default(false),
            tracesDir: z.string().optional(),
            userDataDir: z.string().optional(),
            outputDir: z.string().optional(),
            isolated: z.boolean().default(true),
            saveTrace: z.boolean().default(false),
          })
          .default({}),
      }),
    )
    .mutation(async ({ input }) => {
      const id = Buffer.from(input.scenario).toString('base64');

      /**
       * TODO: improve scalability
       * Note: currently, 2 node.js processes are created for every request.
       * This is not optimal, but it works for now.
       *
       * To improve scalability, we can:
       * 1. create playwright-mcp package as a MCP server.
       *   - This server will be started once and will handle multiple requests.
       *   - The reason for creating a customized playwright-mcp package is that we need to custom browser options and context per request, which is not supported by the current playwright-mcp package.
       * 2. create SSE Transport to MCP server per every request and close it after the request is done
       */
      const result = await explore(
        input.maxAttempts,
        input.scenario,
        input.baseUrl,
        input.inputs,
        input.apiKey,
        input.domainContext,
        input.precondition ?? '',
        input.browserOptions,
      );
      return result;
    }),
});

export type AppRouter = typeof appRouter;
