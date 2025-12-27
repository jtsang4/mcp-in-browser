import { logger } from '../core/logger';
import { AppError, ErrorCode } from '../core/errors';
import { Schemas } from '../core/validator';
import { browser, type Browser } from 'wxt/browser';
import type { JsonValue } from '../../types';
import { sendMessage } from '../../entrypoints/messaging/protocol';

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

  try {
    if (validated.tabId) {
      await browser.tabs.update(validated.tabId, { url: validated.url });
      await browser.tabs.update(validated.tabId, { active: true });
    } else {
      await browser.tabs.create({ url: validated.url });
    }
    return { success: true } as unknown as JsonValue;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as JsonValue;
  }
};

/**
 * Helper to get target tab ID
 */
async function getTargetTabId(tabId?: number): Promise<number> {
  if (tabId) return tabId;
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }
  return activeTab.id;
}

/**
 * Click an element
 */
export const clickTool: ToolHandler = async (params) => {
  const validated = Schemas.click.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  return await sendMessage(
    'click',
    {
      selector: validated.selector,
      tabId: targetTabId,
    },
    targetTabId
  ) as unknown as JsonValue;
};

/**
 * Click at coordinates
 */
export const clickAtTool: ToolHandler = async (params) => {
  const validated = Schemas.clickAt.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  return await sendMessage(
    'click_at',
    {
      x: validated.x,
      y: validated.y,
      tabId: targetTabId,
    },
    targetTabId
  ) as unknown as JsonValue;
};

/**
 * Fill an input field
 */
export const fillTool: ToolHandler = async (params) => {
  const validated = Schemas.fill.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  return await sendMessage(
    'fill',
    {
      selector: validated.selector,
      value: validated.value,
      tabId: targetTabId,
    },
    targetTabId
  ) as unknown as JsonValue;
};

/**
 * Get page content
 */
export const getPageContentTool: ToolHandler = async (params) => {
  const validated = Schemas.getPageContent.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  const result = await sendMessage(
    'get_page_content',
    {
      selector: validated.selector,
      tabId: targetTabId,
    },
    targetTabId
  );

  if (result.success && result.content) {
    result.content = {
      ...result.content,
      timestamp: Date.now(),
    };
  }

  return result as unknown as JsonValue;
};

/**
 * Take a screenshot
 */
export const screenshotTool: ToolHandler = async (params) => {
  const validated = Schemas.screenshot.parse(params);

  try {
    let tabId = validated.tabId;
    if (tabId === undefined) {
      tabId = await getTargetTabId();
    }

    const tab = await browser.tabs.get(tabId);
    if (!tab?.windowId) {
      return { success: false, error: 'No active tab or window found' } as unknown as JsonValue;
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
    } as JsonValue;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as JsonValue;
  }
};

/**
 * List all tabs
 */
export const listTabsTool: ToolHandler = async (params) => {
  const validated = Schemas.listTabs.parse(params);

  try {
    const query = validated.activeOnly ? { active: true } : {};
    const tabs = await browser.tabs.query(query);
    const tabsList = tabs.map((tab) => ({
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || '',
      active: tab.active,
    }));
    return tabsList as unknown as JsonValue;
  } catch (error) {
    return [] as unknown as JsonValue;
  }
};

/**
 * Activate a tab
 */
export const activateTabTool: ToolHandler = async (params) => {
  const validated = Schemas.activateTab.parse(params);

  try {
    await browser.tabs.update(validated.tabId, { active: true });
    const tab = await browser.tabs.get(validated.tabId);
    if (tab.windowId) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
    return { success: true } as unknown as JsonValue;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as JsonValue;
  }
};

/**
 * Reload a tab
 */
export const reloadTool: ToolHandler = async (params) => {
  const validated = Schemas.reload.parse(params);

  try {
    if (validated.tabId) {
      await browser.tabs.reload(validated.tabId);
    } else {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.reload(tabs[0].id);
      }
    }
    return { success: true } as unknown as JsonValue;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as JsonValue;
  }
};

/**
 * Query a single element
 */
export const querySelectorTool: ToolHandler = async (params) => {
  const validated = Schemas.querySelector.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  return await sendMessage(
    'query_selector',
    {
      selector: validated.selector,
      tabId: targetTabId,
    },
    targetTabId
  ) as unknown as JsonValue;
};

/**
 * Query all matching elements
 */
export const querySelectorAllTool: ToolHandler = async (params) => {
  const validated = Schemas.querySelectorAll.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  return await sendMessage(
    'query_selector_all',
    {
      selector: validated.selector,
      tabId: targetTabId,
    },
    targetTabId
  ) as unknown as JsonValue;
};

/**
 * Get form values
 */
export const getFormValuesTool: ToolHandler = async (params) => {
  const validated = Schemas.getFormValues.parse(params);
  const targetTabId = await getTargetTabId(validated.tabId);

  return await sendMessage(
    'get_form_values',
    {
      selector: validated.selector,
      tabId: targetTabId,
    },
    targetTabId
  ) as unknown as JsonValue;
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

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS[name];
}

export function getToolNames(): string[] {
  return Object.keys(TOOLS);
}
