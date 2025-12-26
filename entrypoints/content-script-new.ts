/**
 * Content Script - Enhanced Version with All New Features
 */

import { Interactions } from '../src/content/interactions';
import { WaitFor } from '../src/content/wait-for';
import { PageInfo } from '../src/content/page-info';
import { ElementLocator } from '../src/content/locators';
import { logger, LogLevel } from '../src/core/logger';

// Initialize logger with default config
logger.setConfig({
  logging: {
    level: 'info',
    enableTracing: true,
  },
});

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

/**
 * Send a response message
 */
function sendResponse(id: string, data: unknown, error?: string) {
  const response: ResponseMessage = {
    type: 'response',
    id,
    data,
    error,
  };
  chrome.runtime.sendMessage(response);
}

/**
 * Handle click
 */
async function handleClick(message: ContentMessage) {
  const { selector, options } = message;
  logger.debug('ContentScript', 'Click', { selector });

  const result = await Interactions.click(selector!, options as any);
  return result;
}

/**
 * Handle click at coordinates
 */
async function handleClickAt(message: ContentMessage) {
  const { x, y, options } = message;
  logger.debug('ContentScript', 'ClickAt', { x, y });

  const result = await Interactions.clickAt(x!, y!, options as any);
  return result;
}

/**
 * Handle fill
 */
async function handleFill(message: ContentMessage) {
  const { selector, value, options } = message;
  logger.debug('ContentScript', 'Fill', { selector, value });

  const result = await Interactions.fill(selector!, value!, options as any);
  return result;
}

/**
 * Handle type (character by character)
 */
async function handleType(message: ContentMessage) {
  const { selector, text, options } = message;
  logger.debug('ContentScript', 'Type', { selector, text });

  const result = await Interactions.type(selector!, text!, options as any);
  return result;
}

/**
 * Handle press key
 */
async function handlePressKey(message: ContentMessage) {
  const { key, options } = message;
  logger.debug('ContentScript', 'PressKey', { key });

  const result = await Interactions.pressKey(key!, options as any);
  return result;
}

/**
 * Handle hover
 */
async function handleHover(message: ContentMessage) {
  const { selector, options } = message;
  logger.debug('ContentScript', 'Hover', { selector });

  const result = await Interactions.hover(selector!, options as any);
  return result;
}

/**
 * Handle select option
 */
async function handleSelectOption(message: ContentMessage) {
  const { selector, value } = message;
  logger.debug('ContentScript', 'SelectOption', { selector, value });

  const result = await Interactions.selectOption(selector!, value!);
  return result;
}

/**
 * Handle get page content
 */
async function handleGetPageContent(message: ContentMessage) {
  const { selector } = message;
  logger.debug('ContentScript', 'GetPageContent', { selector });

  try {
    const content = selector
      ? PageInfo.getPageContent(selector)
      : PageInfo.getPageContent();
    return { success: true, content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle query selector
 */
async function handleQuerySelector(message: ContentMessage) {
  const { selector } = message;
  logger.debug('ContentScript', 'QuerySelector', { selector });

  try {
    const element = await WaitFor.element(selector!);
    const info = PageInfo.getElementInfo(element);
    return { success: true, element: info };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle query selector all
 */
async function handleQuerySelectorAll(message: ContentMessage) {
  const { selector } = message;
  logger.debug('ContentScript', 'QuerySelectorAll', { selector });

  try {
    const elements = await WaitFor.element(selector!, { all: true });
    const elementArray = Array.isArray(elements) ? elements : [elements as Element];
    const infos = elementArray.map((el) => PageInfo.getElementInfo(el));
    return { success: true, elements: infos };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle get form values
 */
async function handleGetFormValues(message: ContentMessage) {
  const { selector } = message;
  logger.debug('ContentScript', 'GetFormValues', { selector });

  try {
    const values = PageInfo.getFormValues(selector);
    return { success: true, values };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle get text
 */
async function handleGetText(message: ContentMessage) {
  const { selector } = message;
  logger.debug('ContentScript', 'GetText', { selector });

  const result = await Interactions.getText(selector!);
  return result;
}

/**
 * Handle get attribute
 */
async function handleGetAttribute(message: ContentMessage) {
  const { selector, attribute } = message;
  logger.debug('ContentScript', 'GetAttribute', { selector, attribute });

  const result = await Interactions.getAttribute(selector!, attribute!);
  return result;
}

/**
 * Handle wait for element
 */
async function handleWaitFor(message: ContentMessage) {
  const { selector, options } = message;
  logger.debug('ContentScript', 'WaitFor', { selector, options });

  try {
    await WaitFor.element(selector!, options as any);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle wait for visible
 */
async function handleWaitForVisible(message: ContentMessage) {
  const { selector, options } = message;
  logger.debug('ContentScript', 'WaitForVisible', { selector, options });

  try {
    await WaitFor.visible(selector!, options as any);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle wait for text
 */
async function handleWaitForText(message: ContentMessage) {
  const { selector, text, options } = message;
  logger.debug('ContentScript', 'WaitForText', { selector, text, options });

  try {
    await WaitFor.textContent(selector!, text!, options as any);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle ping
 */
async function handlePing(message: ContentMessage) {
  logger.debug('ContentScript', 'Ping');
  return { pong: true };
}

/**
 * Message handler map
 */
const handlers: Record<string, (message: ContentMessage) => Promise<unknown>> = {
  click: handleClick,
  click_at: handleClickAt,
  fill: handleFill,
  type: handleType,
  press_key: handlePressKey,
  hover: handleHover,
  select_option: handleSelectOption,
  get_page_content: handleGetPageContent,
  query_selector: handleQuerySelector,
  query_selector_all: handleQuerySelectorAll,
  get_form_values: handleGetFormValues,
  get_text: handleGetText,
  get_attribute: handleGetAttribute,
  wait_for: handleWaitFor,
  wait_for_visible: handleWaitForVisible,
  wait_for_text: handleWaitForText,
  ping: handlePing,
};

/**
 * Main message listener
 */
chrome.runtime.onMessage.addListener((message: ContentMessage, sender, _sendResponse) => {
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
      logger.error('ContentScript', `Handler failed for ${type}`, { error });
      sendResponse(id, null, error instanceof Error ? error.message : String(error));
    }
  })();

  return true;
});

// Content script initialization
logger.info('ContentScript', 'Loaded on', {
  url: window.location.href,
  timestamp: Date.now(),
});

// Add type definition for WXT's defineContentScript
declare function defineContentScript(config: any): void;

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[ContentScript] MCP in Browser enhanced version loaded');
  },
});
