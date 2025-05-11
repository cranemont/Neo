// Workaround for the @playwright/mcp package bug
// The package's index.js imports from './lib/index', but that file has a recursive call bug
// This file directly imports from the connection.js file and re-exports the createConnection function

import {createConnection} from '../node_modules/@playwright/mcp/lib/connection.js';

export { createConnection };
