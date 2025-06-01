import { z } from 'zod';

export const AssertionResponseSchema = z.object({
  isFulfilled: z.boolean().describe('Indicates if the scenario is fulfilled'),
  assertion: z.string().describe('Playwright assertion code'),
  explanation: z.string().describe('Explanation of the assertion including why the scenario is fulfilled'),
  locator: z.string().describe('Most related ref from the page snapshot to the assertion'),
});

export type AssertionResponse = z.infer<typeof AssertionResponseSchema>;

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class AssertionPrompt {
  private static readonly schema = AssertionResponseSchema;

  static generate(scenario: string): string {
    return ASSERTION_PROMPT_V1(scenario, JSON.stringify(AssertionPrompt.schema.shape));
  }

  static parseResponse(response: unknown): AssertionResponse {
    return AssertionPrompt.schema.parse(response);
  }
}

export const ASSERTION_PROMPT_V1 = (scenario: string, responseSchema: string) => `
Based on the previous messages containing page snapshots and executed Playwright code, write Playwright assertion code to verify that the test scenario has been fulfilled.

Scenario: ${scenario}

The response should be formatted as follows:
${responseSchema}
`;
