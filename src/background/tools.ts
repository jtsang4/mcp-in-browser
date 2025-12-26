import { logger } from '../core/logger';
import { AppError, ErrorCode } from '../core/errors';
import { Schemas } from '../core/validator';
import { browser, type Browser } from 'wxt/browser';
import type { JsonValue } from '../../types';

export interface ToolHandler<T = JsonValue> {
  (params: Record<string, JsonValue>): Promise<T>;
}


export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
  schema?: typeof Schemas[keyof typeof Schemas];
}

/**
 * Navigate to a URL
 */
export const navigateTool: ToolHandler = async (params) => {
  const validated = Schemas.navigate.parse(params);

  logger.info('Tool:navigate', 'Navigating to URL', { url: validated.url });

  if (validated.tabId) {
    await browser.tabs.update(validated.tabId, { url: validated.url });
    await browser.tabs.update(validated.tabId, { active: true });
  } else {
    await browser.tabs.create({ url: validated.url });
  }

  return { success: true };
};

/**
 * Click an element
 */
export const clickTool: ToolHandler = async (params) => {
  const validated = Schemas.click.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'click', {
    selector: validated.selector,
  });

  return result as { success: boolean; error?: string };
};

/**
 * Click at coordinates
 */
export const clickAtTool: ToolHandler = async (params) => {
  const validated = Schemas.clickAt.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'click_at', {
    x: validated.x,
    y: validated.y,
  });

  return result as { success: boolean; error?: string };
};

/**
 * Fill an input field
 */
export const fillTool: ToolHandler = async (params) => {
  const validated = Schemas.fill.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'fill', {
    selector: validated.selector,
    value: validated.value,
  });

  return result as { success: boolean; error?: string };
};

/**
 * Get page content
 */
export const getPageContentTool: ToolHandler = async (params) => {
  const validated = Schemas.getPageContent.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'get_page_content', {
    selector: validated.selector ?? null,
  }) as { success: boolean; content?: any; error?: string };

  if (result.success && result.content) {
    result.content = {
      ...result.content,
      timestamp: Date.now(),
    };
  }

  return result;
};

/**
 * Take a screenshot
 */
export const screenshotTool: ToolHandler = async (params) => {
  const validated = Schemas.screenshot.parse(params);
  let tab: Browser.tabs.Tab | undefined;

  if (validated.tabId !== undefined) {
    tab = await browser.tabs.get(validated.tabId);
  } else {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  }

  if (!tab?.windowId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab or window found');
  }

  const window = await browser.windows.get(tab.windowId);
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: validated.format || 'png',
    quality: validated.quality || 90,
  });

  return {
    success: true,
    screenshot: {
      dataUrl,
      width: window.width || 0,
      height: window.height || 0,
    },
  };
};

/**
 * List all tabs
 */
export const listTabsTool: ToolHandler = async (params) => {
  const validated = Schemas.listTabs.parse(params);
  const query = validated.activeOnly ? { active: true } : {};
  const tabs = await browser.tabs.query(query);

  return tabs.map((tab) => ({
    id: tab.id!,
    url: tab.url || '',
    title: tab.title || '',
    active: tab.active,
  }));
};

/**
 * Activate a tab
 */
export const activateTabTool: ToolHandler = async (params) => {
  const validated = Schemas.activateTab.parse(params);
  const tabId: number = validated.tabId;

  await browser.tabs.update(tabId, { active: true });
  const tab = await browser.tabs.get(tabId);
  await browser.windows.update(tab.windowId!, { focused: true });

  return { success: true };
};

/**
 * Reload a tab
 */
export const reloadTool: ToolHandler = async (params) => {
  const validated = Schemas.reload.parse(params);

  if (validated.tabId) {
    await browser.tabs.reload(validated.tabId);
  } else {
    const tab = await getCurrentTab();
    if (tab?.id) {
      await browser.tabs.reload(tab.id);
    }
  }

  return { success: true };
};

/**
 * Query a single element
 */
export const querySelectorTool: ToolHandler = async (params) => {
  const validated = Schemas.querySelector.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'query_selector', {
    selector: validated.selector,
  });

  return result as { success: boolean; element?: any; error?: string };
};

/**
 * Query all matching elements
 */
export const querySelectorAllTool: ToolHandler = async (params) => {
  const validated = Schemas.querySelectorAll.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'query_selector_all', {
    selector: validated.selector,
  });

  return result as { success: boolean; elements?: any[]; error?: string };
};

/**
 * Get form values
 */
export const getFormValuesTool: ToolHandler = async (params) => {
  const validated = Schemas.getFormValues.parse(params);
  const tabId = validated.tabId ?? (await getCurrentTabId());

  if (!tabId) {
    throw new AppError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
  }

  const result = await sendToContentScript(tabId, 'get_form_values', {
    selector: validated.selector ?? null,
  });

  return result as { success: boolean; values?: any; error?: string };
};


/**
 * All tool definitions
 */
export const TOOLS: Record<string, ToolDefinition> = {
  navigate: {
    name: 'navigate',
    description: 'Navigate to a URL in the browser',
    handler: navigateTool,
    schema: Schemas.navigate,
  },
  click: {
    name: 'click',
    description: 'Click an element using CSS selector',
    handler: clickTool,
    schema: Schemas.click,
  },
  click_at: {
    name: 'click_at',
    description: 'Click at specific coordinates on the page',
    handler: clickAtTool,
    schema: Schemas.clickAt,
  },
  fill: {
    name: 'fill',
    description: 'Fill an input field with text',
    handler: fillTool,
    schema: Schemas.fill,
  },
  get_page_content: {
    name: 'get_page_content',
    description: 'Get the current page content',
    handler: getPageContentTool,
    schema: Schemas.getPageContent,
  },
  screenshot: {
    name: 'screenshot',
    description: 'Take a screenshot of the current page',
    handler: screenshotTool,
    schema: Schemas.screenshot,
  },
  list_tabs: {
    name: 'list_tabs',
    description: 'List all open browser tabs',
    handler: listTabsTool,
    schema: Schemas.listTabs,
  },
  activate_tab: {
    name: 'activate_tab',
    description: 'Activate a specific tab by ID',
    handler: activateTabTool,
    schema: Schemas.activateTab,
  },
  reload: {
    name: 'reload',
    description: 'Reload the current page or a specific tab',
    handler: reloadTool,
    schema: Schemas.reload,
  },
  query_selector: {
    name: 'query_selector',
    description: 'Query a single element using CSS selector',
    handler: querySelectorTool,
    schema: Schemas.querySelector,
  },
  query_selector_all: {
    name: 'query_selector_all',
    description: 'Query all elements matching a CSS selector',
    handler: querySelectorAllTool,
    schema: Schemas.querySelectorAll,
  },
  get_form_values: {
    name: 'get_form_values',
    description: 'Get all form input values',
    handler: getFormValuesTool,
    schema: Schemas.getFormValues,
  },
};

/**
 * Helper functions
 */

async function getCurrentTabId(): Promise<number | undefined> {
  const tab = await getCurrentTab();
  return tab?.id;
}

async function getCurrentTab(): Promise<Browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendToContentScript<T = JsonValue>(
  tabId: number,
  type: string,
  params: Record<string, JsonValue>,
  timeout = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    const timeoutHandle = setTimeout(() => {
      browser.runtime.onMessage.removeListener(listener);
      reject(new Error('Content script response timeout'));
    }, timeout);

    const listener = (
      message: { type: string; id?: string; data?: JsonValue; error?: string },
      sender: Browser.runtime.MessageSender
    ) => {
      if (message.type === 'response' && message.id === id) {
        browser.runtime.onMessage.removeListener(listener);
        clearTimeout(timeoutHandle);

        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message.data as T);
        }
      }
    };

    browser.runtime.onMessage.addListener(listener);

    browser.tabs.sendMessage(tabId, { type, id, ...params }).catch((error) => {
      browser.runtime.onMessage.removeListener(listener);
      clearTimeout(timeoutHandle);
      reject(error);
    });
  });
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS[name];
}

export function getToolNames(): string[] {
  return Object.keys(TOOLS);
}
