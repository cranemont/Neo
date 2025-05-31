export const ASSERTION_PROMPT_V1 = (scenario: string) => `
Based on the previous messages containing page snapshots and executed Playwright code, write Playwright assertion code to verify that the test scenario has been fulfilled.

Scenario: ${scenario}

The response should be formatted as follows:
\`\`\`json
{
  "isFulfilled": Boolean,
  "assertion": "Playwright assertion code here",
  "explanation": "Explanation of the assertion",
  "locator": "most related ref from the page snapshot to the assertion. Used to generate the snapshot test"
}
\`\`\`
`;
