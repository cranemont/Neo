import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.unknown(),
});

export type ToolSchemaType = z.infer<typeof ToolSchema>;

export abstract class MCPClient {
  protected constructor(protected readonly client: Client) {}

  async listTools(): Promise<ToolSchemaType[]> {
    const tools = await this.client.listTools();
    return tools.tools.map((tool) => ToolSchema.parse(tool));
  }

  async callTool<T extends z.ZodType>(name: string, args: Record<string, unknown>, schema: T): Promise<z.infer<T>> {
    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    return schema.parse(result);
  }

  async connect(transport: Transport): Promise<void> {
    await this.client.connect(transport);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
