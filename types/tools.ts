import type { JsonValue } from './index';

export interface ToolHandler<T = JsonValue> {
  (params: Record<string, JsonValue>): Promise<T>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
}

export interface ToolResult {
  success: boolean;
  error?: string;
}
