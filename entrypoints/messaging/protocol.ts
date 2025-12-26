import { defineExtensionMessaging } from '@webext-core/messaging';
import type { JsonValue } from '../../types/index';
import type { PageContent, ElementInfo } from '../../types/messaging';

// Unified protocol for extension-internal messaging
interface ExtensionProtocolMap {
  // Navigation
  navigate: (input: { url: string; tabId?: number }) => Promise<{ success: boolean }>;
  reload: (input: { tabId?: number }) => Promise<{ success: boolean }>;

  // Tab management
  list_tabs: (input: { activeOnly?: boolean }) => Promise<Array<{ id: number; url: string; title: string; active: boolean }>>;
  activate_tab: (input: { tabId: number }) => Promise<{ success: boolean }>;
  get_current_tab: () => Promise<{ id: number; url?: string; title?: string } | null>;

  // Page content
  get_page_content: (input: { selector?: string; tabId?: number }) => Promise<{ success: boolean; content?: PageContent; error?: string }>;
  screenshot: (input: { tabId?: number; format?: 'png' | 'jpeg'; quality?: number }) => Promise<{ success: boolean; screenshot?: { dataUrl: string; width: number; height: number } }>;

  // Element interactions
  click: (input: { selector: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  click_at: (input: { x: number; y: number; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  fill: (input: { selector: string; value: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  type: (input: { selector: string; text: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  press_key: (input: { key: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  hover: (input: { selector: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  select_option: (input: { selector: string; value: string }) => Promise<{ success: boolean; error?: string }>;

  // Element queries
  query_selector: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; element?: ElementInfo; error?: string }>;
  query_selector_all: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; elements?: ElementInfo[]; error?: string }>;

  // Element data
  get_text: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; text?: string; error?: string }>;
  get_attribute: (input: { selector: string; attribute: string; tabId?: number }) => Promise<{ success: boolean; attribute?: string | null; error?: string }>;

  // Form helpers
  get_form_values: (input: { selector?: string; tabId?: number }) => Promise<{ success: boolean; values?: Record<string, FormDataEntryValue | FormDataEntryValue[]>; error?: string }>;

  // Waiting
  wait_for: (input: { selector: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  wait_for_visible: (input: { selector: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  wait_for_text: (input: { selector: string; text: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;

  // Health check
  ping: () => Promise<{ pong: boolean }>;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ExtensionProtocolMap>();

export type ExtensionProtocolMapType = ExtensionProtocolMap;
