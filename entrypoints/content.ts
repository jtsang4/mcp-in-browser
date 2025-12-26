/**
 * Content Script - WXT Entry Point
 *
 * This file uses the new modular architecture from src/content/
 */

import { defineContentScript } from 'wxt/utils/define-content-script';
import { Interactions } from '../src/content/interactions';
import { WaitFor } from '../src/content/wait-for';
import { PageInfo } from '../src/content/page-info';
import { logger } from '../src/core/logger';

interface ContentMessage {
  type: string;
  id: string;
  selector?: string;
  value?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  attribute?: string;
  options?: Record<string, unknown>;
}

interface ResponseMessage {
  type: 'response';
  id: string;
  data: unknown;
  error?: string;
}

function sendResponse(id: string, data: unknown, error?: string) {
  const response: ResponseMessage = {
    type: 'response',
    id,
    data,
    error,
  };
  chrome.runtime.sendMessage(response);
}

const handlers: Record<string, (message: ContentMessage) => Promise<unknown>> = {
  click: async (msg) => Interactions.click(msg.selector!, msg.options as any),
  click_at: async (msg) => Interactions.clickAt(msg.x!, msg.y!, msg.options as any),
  fill: async (msg) => Interactions.fill(msg.selector!, msg.value!, msg.options as any),
  type: async (msg) => Interactions.type(msg.selector!, msg.text!, msg.options as any),
  press_key: async (msg) => Interactions.pressKey(msg.key!, msg.options as any),
  hover: async (msg) => Interactions.hover(msg.selector!, msg.options as any),
  select_option: async (msg) => Interactions.selectOption(msg.selector!, msg.value!),
  get_page_content: async (msg) => {
    const content = msg.selector ? PageInfo.getPageContent(msg.selector) : PageInfo.getPageContent();
    return { success: true, content };
  },
  query_selector: async (msg) => {
    const result = await WaitFor.element(msg.selector!);
    const element = Array.isArray(result) ? result[0] : result;
    return { success: true, element: PageInfo.getElementInfo(element) };
  },
  query_selector_all: async (msg) => {
    const result = await WaitFor.element(msg.selector!, { all: true });
    const elements = Array.isArray(result) ? result : [result];
    return { success: true, elements: elements.map(el => PageInfo.getElementInfo(el)) };
  },
  get_form_values: async (msg) => ({ success: true, values: PageInfo.getFormValues(msg.selector) }),
  get_text: async (msg) => Interactions.getText(msg.selector!),
  get_attribute: async (msg) => Interactions.getAttribute(msg.selector!, msg.attribute!),
  wait_for: async (msg) => { await WaitFor.element(msg.selector!, msg.options as any); return { success: true }; },
  wait_for_visible: async (msg) => { await WaitFor.visible(msg.selector!, msg.options as any); return { success: true }; },
  wait_for_text: async (msg) => { await WaitFor.textContent(msg.selector!, msg.text!, msg.options as any); return { success: true }; },
  ping: async () => ({ pong: true }),
};

chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, _sendResponse) => {
  (async () => {
    const { type, id } = message;
    const handler = handlers[type];
    if (!handler) {
      sendResponse(id, null, `Unknown message type: ${type}`);
      return;
    }
    try {
      const result = await handler(message);
      sendResponse(id, result);
    } catch (error) {
      sendResponse(id, null, error instanceof Error ? error.message : String(error));
    }
  })();
  return true;
});

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[ContentScript] MCP in Browser loaded on:', window.location.href);
    logger.info('ContentScript', 'Loaded', { url: window.location.href });
  },
});
