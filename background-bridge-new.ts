/**
 * Enhanced Background Bridge Client - Using new modular architecture
 */

import { loadConfig } from './src/core/config';
import { logger } from './src/core/logger';
import { createBridgeClient, type BridgeMessage } from './src/bridge/client';
import { getTool } from './src/background/tools';
import { handleError } from './src/core/errors';
import { AppError, ErrorCode } from './src/core/errors';

let config = await loadConfig();
let bridgeClient = createBridgeClient('extension', { bridge: config.bridge });

// Set up message handler
bridgeClient.setMessageHandler(async (message: BridgeMessage) => {
  if (message.type === 'tool_call' && message.tool) {
    await handleToolCall(message);
  }
});

// Set up connection callbacks
bridgeClient.onConnected(() => {
  logger.info('Bridge', 'Connected to bridge');
});

bridgeClient.onDisconnected(() => {
  logger.warn('Bridge', 'Disconnected from bridge');
});

// Connect
bridgeClient.connect();

/**
 * Handle tool calls from the bridge
 */
async function handleToolCall(message: BridgeMessage) {
  const { tool, params, id } = message;

  logger.info('Bridge', `Executing tool: ${tool}`, { id, params });

  try {
    const toolDef = getTool(tool!);
    if (!toolDef) {
      throw new AppError(ErrorCode.UNKNOWN_TOOL, `Unknown tool: ${tool}`);
    }

    const result = await toolDef.handler(params || {});

    if (id !== undefined) {
      bridgeClient.sendResponse(id, result);
    }

    logger.info('Bridge', `Tool ${tool} completed`, { id });
  } catch (error) {
    const errorResult = handleError(error);
    if (id !== undefined) {
      bridgeClient.sendResponse(id, null, errorResult.error);
    }

    logger.error('Bridge', `Tool ${tool} failed`, { id, error: errorResult });
  }
}

// Export for use in background.ts
export { bridgeClient };

export function isBridgeConnected(): boolean {
  return bridgeClient.isConnectedToBridge();
}

export function getBridgeStatus() {
  return {
    connected: bridgeClient.isConnectedToBridge(),
    queueSize: bridgeClient.getQueueSize(),
    pendingCount: bridgeClient.getPendingCount(),
  };
}
