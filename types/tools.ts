import type { JsonValue } from './index';

export interface ToolHandler<T = JsonValue> {
  (params: Record<string, JsonValue>): Promise<T>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
  schema?: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: JsonValue;
  error?: string;
}

// Tool input interfaces
export interface NavigateInput {
  url: string;
  tabId?: number;
}

export interface ClickInput {
  selector: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface ClickAtInput {
  x: number;
  y: number;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface FillInput {
  selector: string;
  value: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface TypeInput {
  selector: string;
  text: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface PressKeyInput {
  key: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface HoverInput {
  selector: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface SelectOptionInput {
  selector: string;
  value: string;
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

export interface ReloadInput {
  tabId?: number;
}

export interface QuerySelectorInput {
  selector: string;
  tabId?: number;
}

export interface QuerySelectorAllInput {
  selector: string;
  tabId?: number;
}

export interface GetTextInput {
  selector: string;
  tabId?: number;
}

export interface GetAttributeInput {
  selector: string;
  attribute: string;
  tabId?: number;
}

export interface GetFormValuesInput {
  selector?: string;
  tabId?: number;
}

export interface WaitForInput {
  selector: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface WaitForVisibleInput {
  selector: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

export interface WaitForTextInput {
  selector: string;
  text: string;
  tabId?: number;
  options?: Record<string, JsonValue>;
}

// Tool output interfaces
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
