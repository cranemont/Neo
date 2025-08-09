# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neo is a QA automation platform that combines LLM intelligence with Playwright browser automation to create AI-powered testing workflows. It uses a pnpm workspace monorepo structure with TypeScript and ESM modules.

## Key Commands

### Build and Code Quality
```bash
pnpm build                # Build all packages sequentially
pnpm lint                 # Run Biome linter with auto-fix
pnpm format              # Format code with Biome
```

### Explorer Package - Test Automation
```bash
pnpm start:explore       # Explore scenarios using LLM/MCP
pnpm start:explore-file  # Explore using YAML configuration file
pnpm start:record        # Record user actions and generate test code
pnpm report:test         # Run Playwright tests in report directory
pnpm report:show         # Show Playwright test report on port 9999
```

### Development Commands
```bash
# Run specific test by name
pnpm --filter explorer report:test -- --grep "test name"

# Run package-specific scripts
pnpm --filter <package-name> <script>

# Start Electron client
pnpm start:client

# Start MCP server (from playwright-mcp package)
pnpm --filter playwright-mcp start
```

## Architecture

### Monorepo Packages
- **packages/explorer**: Core LLM-powered test scenario exploration and code generation engine
- **packages/playwright-mcp**: MCP server providing Playwright browser automation tools
- **packages/test-runner**: Converts test scenarios to Playwright test files and executes them
- **packages/client-electron**: Electron-based desktop GUI with tRPC communication

### Explorer Package Architecture

1. **LLM Abstraction Layer** (`src/llm/`): Plugin-based architecture for multiple LLM providers
   - `LLMClient` base class with provider-specific adapters
   - `GeminiAdapter` and `ClaudeAdapter` implementations
   - Message system with user/assistant/tool result types

2. **MCP Integration** (`src/mcp/`): Protocol-based browser automation
   - `MCPClient` interface for tool discovery and execution
   - `PlaywrightMcpClient` for Playwright-specific operations
   - Stdio transport communication with MCP server

3. **Code Generation Engine** (`src/codegen/`): Context-driven test generation
   - `PlaywrightCodegen`: Orchestrates LLM queries and MCP tool execution
   - `ExecutionContext`: Manages scenario state and execution history
   - `UserInput`: Handles test data and user interactions

4. **Test Execution Flow**:
   - Parse scenario configuration (YAML or CLI input)
   - Initialize execution context with scenario details
   - Connect to MCP server for browser automation tools
   - Iteratively generate and execute test steps using LLM
   - Generate Playwright test code from execution results
   - Save test files and execution reports

### Key Design Patterns
- **Async/Await**: All external operations use promises
- **TypeScript Strict Mode**: ESNext target with NodeNext module resolution
- **Zod Validation**: Runtime type validation for configurations
- **Workspace Protocol**: Internal packages referenced via `workspace:*`
- **Plugin Architecture**: Extensible LLM provider system

## Configuration

### TypeScript
- Target: ESNext with NodeNext module resolution
- Strict mode enabled (except `noImplicitAny`)
- Experimental decorators enabled
- Source maps generated for debugging

### Biome
- Indent: 2 spaces
- Line width: 120 characters
- Quote style: Single quotes
- Auto-organize imports enabled

### Playwright
- Test directory: `./report` (explorer), `./tests` (test-runner)
- Reporter: HTML with traces and videos
- Default browser: Chromium

## API Keys and Environment

Required environment variables for LLM providers:
- `GEMINI_API_KEY`: For Google Gemini integration
- `ANTHROPIC_API_KEY`: For Claude integration

Optional configurations:
- Storage state files for authentication
- Custom trace directories for debugging
- Browser selection (chromium, firefox, webkit)