import type { JsonValue } from './index';

export interface ContentMessage {
  type: string;
  id: string;
  selector?: string;
  value?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  attribute?: string;
  options?: Record<string, JsonValue>;
}

export type ContentHandlerResult =
  | { success: boolean; error?: string }
  | { success: true; content: PageContent }
  | { success: true; element: ElementInfo }
  | { success: true; elements: ElementInfo[] }
  | { success: true; values: Record<string, FormDataEntryValue | FormDataEntryValue[]> }
  | { success: true; text: string }
  | { success: true; attribute: string | null }
  | { pong: true };

export interface ResponseMessage {
  type: 'response';
  id: string;
  data: ContentHandlerResult | null;
  error?: string;
}

export interface PageContent {
  title: string;
  url: string;
  text?: string;
  html?: string;
  selectedContent?: string;
  timestamp?: number;
  [key: string]: JsonValue | undefined;
}

export interface ElementInfo {
  tagName: string;
  text?: string;
  attributes?: Record<string, string>;
  visible?: boolean;
  [key: string]: JsonValue | undefined;
}
