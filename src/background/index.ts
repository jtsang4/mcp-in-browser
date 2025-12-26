/**
 * Background Script - Modular Entry Point
 */

import { loadConfig, saveConfig, defaultConfig } from '../core/config';
import { logger, LogLevel } from '../core/logger';
import { createBridgeClient } from '../bridge/client';
import { globalTaskQueue } from '../concurrency/task-queue';
import { getTool, getToolNames } from './tools';
import { generateId } from '../core/id-generator';
import { handleError } from '../core/errors';
import { browser, type Browser } from 'wxt/browser';
import type { JsonValue } from '../../types';


// Global state
let bridgeClient: ReturnType<typeof createBridgeClient> | null = null;
let config = defaultConfig;
let currentRequestId: string | null = null;

/**
 * Initialize the background script
 */
export async function initialize() {
  config = await loadConfig();
  logger.setConfig({ logging: config.logging });
  logger.info('Background', 'Initializing MCP in Browser extension');

  // Initialize bridge client
  bridgeClient = createBridgeClient('extension', { bridge: config.bridge });
  bridgeClient.setConfig({ bridge: config.bridge });

  // Set up message handlers
  bridgeClient.setMessageHandler(handleToolCallFromBridge);

  // Set up connection callbacks
  bridgeClient.onConnected(() => {
    logger.info('Background', 'Connected to bridge');
  });

  bridgeClient.onDisconnected(() => {
    logger.warn('Background', 'Disconnected from bridge');
  });

  // Connect to bridge
  bridgeClient.connect();

  // Initialize content script health checking
  setupContentScriptHealthCheck();

  logger.info('Background', 'Initialization complete');
}

/**
 * Handle tool calls from the bridge
 */
async function handleToolCallFromBridge(message: any) {
  if (message.type !== 'tool_call' || !message.tool) {
    return;
  }

  const { tool, params, id } = message;
  currentRequestId = id;

  logger.info('Background', `Executing tool: ${tool}`, { id, params });

  try {
    // Find and execute tool
    const toolDef = getTool(tool);
    if (!toolDef) {
      throw new Error(`Unknown tool: ${tool}`);
    }

    // Execute with concurrency control
    const result = await globalTaskQueue.enqueue(
      () => toolDef.handler(params || {}),
      { priority: 1 }
    );

    // Send response
    bridgeClient?.sendResponse(id!, result);

    logger.info('Background', `Tool ${tool} completed successfully`, { id });
  } catch (error) {
    const errorResult = handleError(error);
    bridgeClient?.sendResponse(id!, null, errorResult.error);

    logger.error('Background', `Tool ${tool} failed`, { id, error: errorResult });
  } finally {
    currentRequestId = null;
  }
}

/**
 * Send message to content script
 */
export async function sendToContentScript<T = JsonValue>(
  tabId: number,
  type: string,
  params: Record<string, JsonValue>,
  timeout = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = generateId('msg');

    logger.debug('Background', `Sending message to content script`, {
      tabId,
      type,
      id,
    });

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

        logger.debug('Background', `Received response from content script`, {
          tabId,
          type,
          id,
        });
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

/**
 * Get current tab
 */
export async function getCurrentTab(): Promise<Browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

/**
 * Setup content script health checking
 */
function setupContentScriptHealthCheck() {
  // Ping active tabs periodically to check content script status
  setInterval(async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const result = await sendToContentScript<{ pong: boolean }>(
          tabs[0].id,
          'ping',
          {},
          5000
        );
        if (!result.pong) {
          logger.warn('Background', 'Content script not responding', {
            tabId: tabs[0].id,
          });
        }
      }
    } catch (error) {
      logger.debug('Background', 'Health check failed', { error });
    }
  }, 60000); // Check every minute
}

/**
 * Re-inject content script if needed
 */
export async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    await sendToContentScript(tabId, 'ping', {}, 5000);
    return true;
  } catch (error) {
    logger.info('Background', 'Re-injecting content script', { tabId });

    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/content.js'],
      });
      return true;
    } catch (injectError) {
      logger.error('Background', 'Failed to inject content script', {
        tabId,
        error: injectError,
      });
      return false;
    }
  }
}

/**
 * Get available tools
 */
export function getAvailableTools(): Array<{ name: string; description: string }> {
  return getToolNames().map((name) => {
    const tool = getTool(name)!;
    return {
      name: tool.name,
      description: tool.description,
    };
  });
}

/**
 * Update configuration
 */
export async function updateConfig(newConfig: Partial<typeof config>) {
  config = { ...config, ...newConfig };
  await saveConfig(newConfig);

  // Update dependent configs
  logger.setConfig({ logging: config.logging });
  globalTaskQueue.setConfig({ concurrency: config.concurrency });
  bridgeClient?.setConfig({ bridge: config.bridge });

  logger.info('Background', 'Configuration updated', { newConfig });
}

/**
 * Get status
 */
export function getStatus() {
  return {
    connected: bridgeClient?.isConnectedToBridge() ?? false,
    queue: bridgeClient?.getQueueSize() ?? 0,
    pending: bridgeClient?.getPendingCount() ?? 0,
    taskQueue: globalTaskQueue.getStatus(),
    config: {
      loggingLevel: config.logging.level,
      concurrency: config.concurrency,
    },
  };
}

/**
 * Get logs
 */
export function getLogs(options?: { level?: LogLevel; limit?: number; requestId?: string }) {
  const history = logger.getHistory({
    level: options?.level,
    requestId: options?.requestId,
  });

  return options?.limit ? history.slice(-options.limit) : history;
}

/**
 * Clear logs
 */
export function clearLogs() {
  logger.clearHistory();
}

/**
 * Shutdown
 */
export function shutdown() {
  logger.info('Background', 'Shutting down');

  bridgeClient?.disconnect();
  globalTaskQueue.clear();

  logger.clearHistory();
}




