import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOpenClawMcpServer } from "./server.js";

export interface McpAgentClient {
  client: Client;
  close: () => Promise<void>;
}

export async function createMcpAgentClient(): Promise<McpAgentClient> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const server = createOpenClawMcpServer();
  await server.connect(serverTransport);

  const client = new Client({ name: "openclaw-agent-client", version: "0.1.0" });
  await client.connect(clientTransport);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

export async function listMcpTools(client: Client): Promise<
  Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>
> {
  const response = await client.listTools();
  return response.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as Record<string, unknown> | undefined,
  }));
}

export async function callMcpTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await client.callTool({
    name,
    arguments: args,
  });
  return result as { content: Array<{ type: string; text: string }> };
}
