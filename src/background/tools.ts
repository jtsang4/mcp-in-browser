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

  return await sendMessage('navigate', {
    url: validated.url,
    tabId: validated.tabId,
  });
};

/**
 * Click an element
 */
export const clickTool: ToolHandler = async (params) => {
  const validated = Schemas.click.parse(params);

  return await sendMessage('click', {
    selector: validated.selector,
    tabId: validated.tabId,
  });
};

/**
 * Click at coordinates
 */
export const clickAtTool: ToolHandler = async (params) => {
  const validated = Schemas.clickAt.parse(params);

  return await sendMessage('click_at', {
    x: validated.x,
    y: validated.y,
    tabId: validated.tabId,
  });
};

/**
 * Fill an input field
 */
export const fillTool: ToolHandler = async (params) => {
  const validated = Schemas.fill.parse(params);

  return await sendMessage('fill', {
    selector: validated.selector,
    value: validated.value,
    tabId: validated.tabId,
  });
};

/**
 * Get page content
 */
export const getPageContentTool: ToolHandler = async (params) => {
  const validated = Schemas.getPageContent.parse(params);

  const result = await sendMessage('get_page_content', {
    selector: validated.selector,
    tabId: validated.tabId,
  });

  if (result.success && result.content) {
    result.content = {
      ...result.content,
      timestamp: Date.now(),
    };
  }

  return result as JsonValue;
};

/**
 * Take a screenshot
 */
export const screenshotTool: ToolHandler = async (params) => {
  const validated = Schemas.screenshot.parse(params);

  return await sendMessage('screenshot', {
    tabId: validated.tabId,
    format: validated.format,
    quality: validated.quality,
  }) as JsonValue;
};

/**
 * List all tabs
 */
export const listTabsTool: ToolHandler = async (params) => {
  const validated = Schemas.listTabs.parse(params);

  return await sendMessage('list_tabs', {
    activeOnly: validated.activeOnly,
  }) as JsonValue;
};

/**
 * Activate a tab
 */
export const activateTabTool: ToolHandler = async (params) => {
  const validated = Schemas.activateTab.parse(params);

  return await sendMessage('activate_tab', {
    tabId: validated.tabId,
  }) as JsonValue;
};

/**
 * Reload a tab
 */
export const reloadTool: ToolHandler = async (params) => {
  const validated = Schemas.reload.parse(params);

  return await sendMessage('reload', {
    tabId: validated.tabId,
  }) as JsonValue;
};

/**
 * Query a single element
 */
export const querySelectorTool: ToolHandler = async (params) => {
  const validated = Schemas.querySelector.parse(params);

  return await sendMessage('query_selector', {
    selector: validated.selector,
    tabId: validated.tabId,
  }) as JsonValue;
};

/**
 * Query all matching elements
 */
export const querySelectorAllTool: ToolHandler = async (params) => {
  const validated = Schemas.querySelectorAll.parse(params);

  return await sendMessage('query_selector_all', {
    selector: validated.selector,
    tabId: validated.tabId,
  }) as JsonValue;
};

/**
 * Get form values
 */
export const getFormValuesTool: ToolHandler = async (params) => {
  const validated = Schemas.getFormValues.parse(params);

  return await sendMessage('get_form_values', {
    selector: validated.selector,
    tabId: validated.tabId,
  }) as JsonValue;
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
