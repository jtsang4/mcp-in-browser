#!/usr/bin/env node

/**
 * Enhanced MCP Server - Using new modular architecture
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createBridgeClient, type BridgeMessage } from '../src/bridge/client';
import { Schemas } from '../src/core/validator';
import { logger } from '../src/core/logger';

// Initialize logger for Node.js
logger.setConfig({
  logging: {
    level: 'info',
    enableTracing: true,
  },
});

let bridgeClient = createBridgeClient('mcp-server', {
  bridge: {
    url: 'ws://localhost:37373',
    port: 37373,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    messageQueueLimit: 100,
  },
});

// Set up connection callbacks
bridgeClient.onConnected(() => {
  logger.info('MCP-Server', 'Connected to bridge');
});

bridgeClient.onDisconnected(() => {
  logger.warn('MCP-Server', 'Disconnected from bridge');
});

// Connect to bridge
bridgeClient.connect();

/**
 * Tool definitions
 */
const TOOLS: Tool[] = [
  {
    name: 'navigate',
    description: 'Navigate to a URL in the browser. Optionally specify a tab ID to navigate in a specific tab.',
    inputSchema: Schemas.navigate as any,
  },
  {
    name: 'click',
    description: 'Click an element on the page using CSS selector',
    inputSchema: Schemas.click as any,
  },
  {
    name: 'click_at',
    description: 'Click at a specific coordinate on the page (x, y in pixels relative to the viewport)',
    inputSchema: Schemas.clickAt as any,
  },
  {
    name: 'fill',
    description: 'Fill an input field with text using CSS selector',
    inputSchema: Schemas.fill as any,
  },
  {
    name: 'type',
    description: 'Type text character by character into an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        text: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        ctrl: { type: 'boolean' },
        alt: { type: 'boolean' },
        shift: { type: 'boolean' },
        meta: { type: 'boolean' },
      },
      required: ['key'],
    },
  },
  {
    name: 'hover',
    description: 'Hover over an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'select_option',
    description: 'Select an option from a dropdown',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        value: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'get_page_content',
    description: 'Get the current page content including title, URL, and text content',
    inputSchema: Schemas.getPageContent as any,
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of the current page or a specific tab',
    inputSchema: Schemas.screenshot as any,
  },
  {
    name: 'list_tabs',
    description: 'List all open browser tabs',
    inputSchema: Schemas.listTabs as any,
  },
  {
    name: 'activate_tab',
    description: 'Activate a specific tab by ID',
    inputSchema: Schemas.activateTab as any,
  },
  {
    name: 'reload',
    description: 'Reload the current page or a specific tab',
    inputSchema: Schemas.reload as any,
  },
  {
    name: 'query_selector',
    description: 'Query a single element using CSS selector and return its details',
    inputSchema: Schemas.querySelector as any,
  },
  {
    name: 'query_selector_all',
    description: 'Query all elements matching a CSS selector',
    inputSchema: Schemas.querySelectorAll as any,
  },
  {
    name: 'get_form_values',
    description: 'Get all form input values from the current page',
    inputSchema: Schemas.getFormValues as any,
  },
  {
    name: 'get_text',
    description: 'Get the text content of an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_attribute',
    description: 'Get an attribute value from an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        attribute: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['selector', 'attribute'],
    },
  },
  {
    name: 'wait_for',
    description: 'Wait for an element to appear in the DOM',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeout: { type: 'number' },
        tabId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'wait_for_visible',
    description: 'Wait for an element to become visible',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeout: { type: 'number' },
        tabId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'wait_for_text',
    description: 'Wait for an element to contain specific text',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        text: { type: 'string' },
        timeout: { type: 'number' },
        tabId: { type: 'number' },
      },
      required: ['selector', 'text'],
    },
  },
];

/**
 * Send tool call to extension via bridge
 */
async function sendToolCall(
  tool: string,
  params: Record<string, unknown>,
  timeout = 30000
): Promise<unknown> {
  if (!bridgeClient.isConnectedToBridge()) {
    throw new Error('Bridge not connected. Please ensure the bridge server is running (pnpm run bridge) and the Chrome extension is connected.');
  }

  return bridgeClient.sendRequest(tool, params, timeout);
}

// Create MCP server
const server = new Server(
  {
    name: 'mcp-in-browser-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('MCP-Server', `Tool call: ${name}`, { args });

  try {
    const result = await sendToolCall(name, args || {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('MCP-Server', `Tool call failed: ${name}`, { error });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP-Server', 'Server running on stdio');
}

main().catch((error) => {
  logger.error('MCP-Server', 'Fatal error', { error });
  process.exit(1);
});
