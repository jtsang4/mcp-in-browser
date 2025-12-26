// Core JSON-compatible value type
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Basic JSON Schema type
export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number)[];
  description?: string;
  [key: string]: unknown;
};

// Tool input schemas (will be moved to tools.ts in Task 2.2)
export interface NavigateInput {
  url: string;
  tabId?: number;
}

export interface ClickInput {
  selector: string;
  tabId?: number;
}

export interface ClickAtInput {
  x: number;
  y: number;
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

// Tool outputs (will be moved to appropriate files in Task 2.2)
export interface ToolResult {
  success: boolean;
  data?: JsonValue;
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

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
}

// Re-export from other type files for backward compatibility
// These will be removed in Task 2.2 when imports are updated
export type { BridgeMessage, BridgeClientType, BridgeClientConfig } from './bridge';
export type { ContentMessage, ContentHandlerResult, ResponseMessage, ElementInfo } from './messaging';
export type { ToolHandler, ToolDefinition } from './tools';
export type { LoggingConfig, BridgeConfig, AppConfig, getDefaultConfig } from './config';
