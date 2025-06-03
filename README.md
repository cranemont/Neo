## Installation

```bash
pnpm install
pnpm build
```

## Usage

### Exploring Scenarios

Explore scenarios and generate tests using LLM and MCP.

```bash
pnpm start:explore -- [options]
```

Options:
- `--scenario, -s`: Scenario to run (Required)
- `--url, -u`: Base URL to start from (Required)
- `--api-key, -k`: LLM API key (Gemini by default, Required)
- `--input, -i`: User input (key,value,description format)
- `--domain-context, -d`: Domain context
- `--max-attempts, -m`: Maximum number of attempts
- `--precondition, -p`: Precondition file name to run before scenario(e.g., "example" for `preconditions/example.spec.js`)

Example:
```bash
pnpm start:explore --scenario "User can access dashboard page after login" \
  --url https://www.google.com \
  --api-key API_KEY \
  --input email,test@email.com,"account email" password,test123,"account password"
```

### Running Recorder

Use the Recorder to capture user actions on web pages and generate test code.
It is Intended for creating preconditions for test scenarios.
(Simple wrapper around the Playwright Test Generator)

```bash
pnpm start:record --url <URL> [options]
```

Options:
- `--url, -u`: URL of the web page to record (required)
- `--output-file, -o`: Output file path (optional, default: `./preconditions/recording-{timestamp}.spec.js`)
- `--language, -l`: Output language (optional, default: `playwright-test`)
    - Supported languages: `playwright-test`, `javascript`, `python`, `java`
- `--headless`: Run in headless mode (optional, default: false)

Examples:
```bash
# Record with default settings
pnpm start:record --url https://www.google.com

# Specify output file
pnpm start:record --url https://www.google.com --output-file ./my-test.spec.js

# Output in Python
pnpm start:record --url https://www.google.com --language python

# Run in headless mode
pnpm start:record --url https://www.google.com --headless
```