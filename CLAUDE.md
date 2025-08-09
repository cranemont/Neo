# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neo is a QA automation project based on Playwright that leverages LLM (Large Language Models) and MCP (Model Context Protocol) to automate test scenario exploration, record user actions, and generate Playwright test code. The project uses a monorepo structure with pnpm workspaces.

## Key Commands

### Build
```bash
pnpm build                # Build all packages
```

### Linting and Formatting
```bash
pnpm lint                 # Run Biome linter with auto-fix
pnpm format              # Format code with Biome
```

### Explorer Package Commands
```bash
pnpm start:explore       # Explore scenarios using LLM/MCP
pnpm start:explore-file  # Explore using YAML configuration file
pnpm start:record        # Record user actions and generate test code
pnpm report:test         # Run Playwright tests in report directory
pnpm report:show         # Show Playwright test report on port 9999
```

### Development
```bash
# Run a single test
pnpm --filter explorer report:test -- --grep "test name"

# Run specific package scripts
pnpm --filter <package-name> <script>
```

## Architecture

### Monorepo Structure
- **packages/explorer**: Main QA automation agent that explores scenarios and generates tests
- **packages/playwright-mcp**: MCP server integration for Playwright browser automation
- **packages/test-runner**: Test execution and scenario conversion utilities
- **packages/client-electron**: Electron-based desktop client

### Explorer Package Architecture
The Explorer package follows a modular architecture:

1. **LLM Integration** (`src/llm/`): Abstracts LLM providers (Gemini, Claude) with a common interface
   - `LLMClient` interface for querying
   - Provider-specific adapters (GeminiAdapter, ClaudeAdapter)
   - Message and prompt management

2. **MCP Integration** (`src/mcp/`): Handles browser automation through Model Context Protocol
   - `MCPClient` interface for tool discovery and execution
   - `PlaywrightMcpClient` for Playwright-specific operations

3. **Code Generation** (`src/codegen/`): Orchestrates test generation
   - `PlaywrightCodegen`: Main code generation logic
   - `ExecutionContext`: Manages scenario execution state
   - `UserInput`: Handles user-provided test data

4. **Exploration Flow**:
   - Initialize execution context with scenario details
   - Connect to MCP server for browser automation
   - Use LLM to generate and execute test steps iteratively
   - Capture results and generate Playwright test code

### Key Patterns
- **Async/Await**: All external operations use promises
- **TypeScript**: Strict typing with ESNext target
- **Modular Design**: Clear separation of concerns between LLM, MCP, and code generation
- **Error Handling**: Comprehensive logging with Winston logger

## Configuration

### TypeScript Configuration
- Target: ESNext with NodeNext module resolution
- Strict mode enabled (except `noImplicitAny`)
- Experimental decorators enabled

### Biome Configuration
- Indent: 2 spaces
- Line width: 120 characters
- Quote style: Single quotes
- Auto-organize imports enabled
