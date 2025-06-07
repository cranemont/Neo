import type { LLMClient } from '../llm/LLMClient.js';
import type { ExecutionResult } from '../codegen/ExecutionResult.js';
import { EvaluationPrompt, type EvaluationResult } from '../llm/prompt/evaluate.js';
import { TextUserMessage } from '../llm/message/user/UserMessage.js';
import { QueryContext } from '../llm/QueryContext.js';
import logger from "../logger.js";

export class Evaluator {
  constructor(private readonly llmClient: LLMClient) {}

  async evaluate(executionResults: ExecutionResult[], chunkSize = 5) {
    if (executionResults.length === 0) {
      throw new Error('No execution results to evaluate.');
    }

    const evaluationResults: {
      id: string;
      executionResult: ExecutionResult;
      evaluationResult: EvaluationResult;
    }[] = [];

    for (let i = 0; i < executionResults.length; i += chunkSize) {
      const chunk = executionResults.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (result) => {
          const evaluationResult = await this.evaluateSingle(result);
          return {
            id: result.id,
            executionResult: result,
            evaluationResult,
          };
        }),
      );
      evaluationResults.push(...results);
    }

    return evaluationResults;
  }

  async evaluateSingle(executionResult: ExecutionResult): Promise<EvaluationResult> {
    const response = await this.llmClient.query(
      new QueryContext([new TextUserMessage(EvaluationPrompt.generate(executionResult))]),
    );

    if (response.isEndTurn()) {
      return EvaluationPrompt.parseResponse(response.getSerializedLastMessage());
    }

    // throw new Error(`Evaluation failed for result ${executionResult.id}: ${response} || 'Unknown error'`);
    logger.error(`Evaluation failed for result ${executionResult.id}: ${response} || 'Unknown error'`);
    return {
      isValid: false,
      reason: `Evaluation failed for result ${executionResult.id}: ${JSON.stringify(response)} || 'Unknown error'`,
    };
  }
}
