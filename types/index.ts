// MCP Tool definitions for Chrome automation
export interface ChromeTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
}

// Tool input schemas
export interface NavigateInput {
  url: string;
  tabId?: number;
}

export interface ClickInput {
  selector: string;
  tabId?: number;
}

export interface FillInput {
  selector: string;
  value: string;
  tabId?: number;
}

export interface GetPageContentInput {
  selector?: string;
  tabId?: number;
}

export interface ScreenshotInput {
  tabId?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface ListTabsInput {
  activeOnly?: boolean;
}

export interface ActivateTabInput {
  tabId: number;
}

// Tool outputs
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface PageContent {
  url: string;
  title: string;
  html?: string;
  text?: string;
  selectedContent?: string;
  timestamp: number;
}

export interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
}

// Extension message types
export interface ExtensionMessage {
  type: 'tool_call' | 'tool_result' | 'keep_alive';
  tool?: string;
  params?: Record<string, unknown>;
  id?: string;
}

export interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  id?: string;
}
