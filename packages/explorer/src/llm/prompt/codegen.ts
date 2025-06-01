export const CODE_EXTRACTION_PROMPT_V1 = (scenario: string, code: string) => `
Based on the previous messages containing page snapshots and executed Playwright code, write Playwright test code with optimized path to fulfill the test scenario.
Remove any unnecessary code that does not contribute to fulfilling the scenario. For example, remove any attempts to find the desired path or routing that were not successful.

Scenario: ${scenario}
Executed Code: ${code}

The response should be formatted as follows:
\`\`\`json
{
  "code": "Playwright code here",
  "explanation": "Explanation of the code and changes made",
}
\`\`\`
`;
