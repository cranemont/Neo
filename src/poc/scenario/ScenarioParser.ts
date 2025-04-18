import type { LLMClient } from '../LLMClient';
import { PROMPT_M } from './ScenarioParserPrompts';

interface ParsedScenario {
  preconditions: string[];
  assertion: string;
}

export class ScenarioParser {
  constructor(private readonly _llmClient: LLMClient) {}

  async parse(scenario: string): Promise<ParsedScenario> {
    const result = await this._llmClient.message(PROMPT_M.replace('{{SCENARIO}}', scenario));

    const match = result.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error('코드 블록 내용이 유효한 JSON이 아닙니다:', e);

        throw e;
      }
    }

    try {
      return JSON.parse(result.text);
    } catch (e) {
      console.error('전체 응답이 유효한 JSON이 아닙니다:', e);

      throw e;
    }
  }
}
