// JSON Schema type for tool input definitions
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  items?: JsonSchema;
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  [key: string]: JsonSchema | string | number | boolean | string[] | (string | number | boolean)[] | Record<string, JsonSchema> | undefined;
}

// MCP Tool definitions for Chrome automation
export interface ChromeTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
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

// JSON-compatible value type (strict)
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// Serializable value type (allows undefined and interface types)
export type SerializableValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | SerializableValue[] 
  | { [key: string]: SerializableValue };

// Tool outputs
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

// Extension message types
export interface ExtensionMessage {
  type: 'tool_call' | 'tool_result' | 'keep_alive';
  tool?: string;
  params?: Record<string, JsonValue>;
  id?: string;
}

export interface ExtensionResponse {
  success: boolean;
  data?: JsonValue;
  error?: string;
  id?: string;
}
