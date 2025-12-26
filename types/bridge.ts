import type { JsonValue } from './index';

export interface BridgeMessage {
  type: 'hello' | 'tool_call' | 'response' | 'error';
  id?: string;
  tool?: string;
  params?: Record<string, JsonValue>;
  data?: JsonValue | null;
  error?: string;
  client?: 'extension' | 'mcp-server';
  status?: string;
}

export type BridgeClientType = 'extension' | 'mcp-server';

export interface BridgeClientConfig {
  url: string;
  port: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageQueueLimit: number;
}
