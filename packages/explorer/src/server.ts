import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router.js';
import logger from './logger.js';

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000);
logger.info('Explorer server started on port 3000');
