import fs from 'node:fs/promises';
import path from 'node:path';
import { ScenarioConverter } from './converter/ScenarioConverter';
import type { TestScenario } from './types';

async function main() {
  const [, , inputFile] = process.argv;

  if (!inputFile) {
    console.error('Usage: node cli.js <scenario.json>');
    process.exit(1);
  }

  try {
    // JSON 파일 읽기
    const jsonContent = await fs.readFile(inputFile, 'utf-8');
    const scenario: TestScenario = JSON.parse(jsonContent);

    // 변환
    const converter = new ScenarioConverter(scenario, {
      outputDir: 'tests',
      includeComments: true,
    });

    const { testCode, filePath } = await converter.convert();

    // 결과 저장
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, testCode);

    console.log(`✅ Test file generated: ${filePath}`);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
