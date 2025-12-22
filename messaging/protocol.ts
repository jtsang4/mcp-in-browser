import { defineExtensionMessaging } from '@webext-core/messaging';
import type { ToolResult, NavigateInput, ClickInput, FillInput, GetPageContentInput, ScreenshotInput, ListTabsInput, ActivateTabInput, PageContent, ScreenshotResult, TabInfo } from '@/types';

// Protocol map for type-safe messaging between extension contexts
interface ProtocolMap {
  // Tab management
  tabs_list: (input: ListTabsInput) => TabInfo[];
  tabs_activate: (input: ActivateTabInput) => void;
  tabs_get_current: () => TabInfo | null;

  // Navigation
  navigate: (input: NavigateInput) => Promise<ToolResult>;
  reload: (tabId?: number) => Promise<ToolResult>;

  // Page interaction
  click: (input: ClickInput) => Promise<ToolResult>;
  fill: (input: FillInput) => Promise<ToolResult>;
  get_page_content: (input: GetPageContentInput) => Promise<ToolResult & { content?: PageContent }>;
  screenshot: (input: ScreenshotInput) => Promise<ToolResult & { screenshot?: ScreenshotResult }>;

  // Element queries
  query_selector: (input: { selector: string; tabId?: number }) => Promise<ToolResult & { element?: string }>;
  query_selector_all: (input: { selector: string; tabId?: number }) => Promise<ToolResult & { elements?: string[] }>;

  // Form helpers
  get_form_values: (input: { selector?: string; tabId?: number }) => Promise<ToolResult & { values?: Record<string, unknown> }>;

  // Content script health check
  ping: (tabId: number) => Promise<boolean>;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

export type ProtocolMapType = ProtocolMap;
