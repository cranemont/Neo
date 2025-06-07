import { z } from 'zod';
import type { ExecutionResult } from '../../codegen/ExecutionResult.js';
import type { ExecutionContext } from '../../codegen/ExecutionContext.js';

const EvaluationResponseSchema = z.object({
  isValid: z.boolean().describe('Indicates whether the evaluation result is valid'),
  reason: z.string().describe('Reason for the evaluation result'),
});

export type EvaluationResult = z.infer<typeof EvaluationResponseSchema>;

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class EvaluationPrompt {
  private static readonly schema = EvaluationResponseSchema;

  static generate(result: ExecutionResult): string {
    return EVALUATION_PROMPT_V1(result.executionContext, result, JSON.stringify(EvaluationPrompt.schema.shape));
  }

  static parseResponse(response: unknown): EvaluationResult {
    return EvaluationPrompt.schema.parse(response);
  }
}

export const EVALUATION_PROMPT_V1 = (
  executionContext: ExecutionContext,
  executionResult: ExecutionResult,
  responseSchema: string,
) => `
You are an expert QA professional and final evaluator. Your task is to accurately verify and assess the validity of QA results to ensure a reliable QA system. You will be provided with QA result data, including the context used for QA and the last snapshot. Your goal is to evaluate whether the test scenario was executed correctly and if the results are trustworthy.

First, I will present you with the execution context:

<execution_context>
Scenario: ${executionContext.scenario}
BaseUrl: ${executionContext.baseUrl}
User Inputs: ${JSON.stringify(executionContext.userInputs.map((input) => input.keyWithDescription))}
Domain Context: ${executionContext.domainContext.join('\n')}
</execution_context>

Next, here is the execution result:

<execution_result>
Status: ${executionResult.status}
Reason for Success/Failure: ${executionResult.description}
Playwright Codes: ${executionResult.playwrightCodes.join('\n')}
Playwright Assertion: ${executionResult.playwrightAssertion || 'None'}
Last Snapshot: ${executionResult.lastSnapshot || 'None'}
</execution_result>

To evaluate the QA results, please follow these steps:

1. Analyze the execution context:
   - Review the scenario description
   - Consider the domain context

2. Evaluate the execution result:
   - Assess the status (success or failure)
   - Review the reason for success or failure
   - Examine the Playwright codes to understand the test flow
   - Check the Playwright assertion (if any)
   - Analyze the last snapshot (if available)

3. Determine the reliability of the test:
   - Does the executed scenario match the intended scenario?
   - Were all necessary steps performed?
   - Does the last snapshot (if available) support the test outcome?

4. Identify any potential issues or inconsistencies in the test execution or results.

5. Formulate an overall assessment of the QA result's validity and reliability.

Please note that the generated Playwright code and assertions are actual code executed and recorded during the QA process. Use them only as a reference to confirm the test flow.

After completing your analysis, provide your evaluation using the following response schema(JSON format):
<response_schema>
${responseSchema}
</response_schema>

Begin your response with a [scratchpad] section where you think through your evaluation step-by-step. 
Then, provide your final assessment in the format specified by the JSON formatted response, ensuring that you include all required fields.
`;
