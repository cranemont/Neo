import { publicProcedure, router } from './trpc.js';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { z } from 'zod';
import { explore } from './explore.js';
import { UserInput } from './codegen/UserInput.js';

const appRouter = router({
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

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000);
