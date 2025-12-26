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
import { sendMessage } from '../../entrypoints/messaging/protocol';

// Register background message handlers
import '../../entrypoints/messaging/background-handlers';


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
  bridgeClient = createBridgeClient('extension', config.bridge);
  bridgeClient.setConfig(config.bridge);

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
 * Send message to content script (deprecated - use sendMessage from protocol)
 * This is kept for backward compatibility but should be removed
 */
export async function sendToContentScript<T = JsonValue>(
  _tabId: number,
  type: string,
  _params: Record<string, JsonValue>,
  _timeout = 30000
): Promise<T> {
  // Use the unified messaging protocol
  // Note: tab-specific routing is not fully supported with @webext-core/messaging
  // The message will be broadcast to all tabs
  if (type === 'ping') {
    return await sendMessage('ping') as T;
  }
  throw new Error(`sendToContentScript called with unsupported type: ${type}`);
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
      const result = await sendMessage('ping');
      if (!result.pong) {
        logger.warn('Background', 'Content script not responding');
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
    await sendMessage('ping');
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
  bridgeClient?.setConfig(config.bridge);

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




