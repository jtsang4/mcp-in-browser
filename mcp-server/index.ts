#!/usr/bin/env node

/**
 * MCP Server for MCP in Browser
 *
 * This MCP server provides tools for browser automation through the browser extension.
 * It communicates with the extension via a WebSocket bridge.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import WebSocket from 'ws';

// Polyfill WebSocket for Node.js environment
if (!global.WebSocket) {
  // @ts-ignore
  global.WebSocket = WebSocket;
}

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BridgeClient, createBridgeClient } from '../shared/bridge/client';
import type { BridgeMessage } from '../types/bridge';
import type { JsonValue } from '../types';

// Use shared BridgeClient
const bridgeClient = createBridgeClient('mcp-server');

// Set up message handler for responses
bridgeClient.setMessageHandler(async (message: BridgeMessage) => {
  if (message.type === 'response') {
    // Handle response - this will be managed by sendRequest
  }
});

// Set up connection callbacks
bridgeClient.onConnected(() => {
  console.error('[MCP] Connected to bridge');
});

bridgeClient.onDisconnected(() => {
  console.error('[MCP] Disconnected from bridge');
});

// Connect to bridge
bridgeClient.connect();

// Define all available tools
const TOOLS: Tool[] = [
  {
    name: 'navigate',
    description: 'Navigate to a URL in the browser. Optionally specify a tab ID to navigate in a specific tab.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID to navigate in a specific tab',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'click',
    description: 'Click an element on the page using CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'click_at',
    description: 'Click at a specific coordinate on the page (x, y in pixels relative to the viewport)',
    inputSchema: {
      type: 'object',
      properties: {
        x: {
          type: 'number',
          description: 'X coordinate in pixels (relative to the viewport)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate in pixels (relative to the viewport)',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'fill',
    description: 'Fill an input field with text using CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the input element',
        },
        value: {
          type: 'string',
          description: 'The text value to fill',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'get_page_content',
    description: 'Get the current page content including title, URL, and text content',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to get content from specific element',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
    },
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of the current page or a specific tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Image format (default: png)',
        },
        quality: {
          type: 'number',
          description: 'Quality for JPEG (0-100, default: 90)',
        },
      },
    },
  },
  {
    name: 'list_tabs',
    description: 'List all open browser tabs',
    inputSchema: {
      type: 'object',
      properties: {
        activeOnly: {
          type: 'boolean',
          description: 'Only list active tabs from each window',
        },
      },
    },
  },
  {
    name: 'activate_tab',
    description: 'Activate a specific tab by ID',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to activate',
        },
      },
      required: ['tabId'],
    },
  },
  {
    name: 'reload',
    description: 'Reload the current page or a specific tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'number',
          description: 'Optional tab ID to reload (defaults to current tab)',
        },
      },
    },
  },
  {
    name: 'query_selector',
    description: 'Query a single element using CSS selector and return its details',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to query',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'query_selector_all',
    description: 'Query all elements matching a CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to query',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_form_values',
    description: 'Get all form input values from the current page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector for a specific form',
        },
        tabId: {
          type: 'number',
          description: 'Optional tab ID (defaults to current tab)',
        },
      },
    },
  },
];

/**
 * Send a message to the Chrome extension via the WebSocket bridge
 */
async function sendExtensionMessage(toolName: string, params: Record<string, JsonValue>): Promise<JsonValue> {
  try {
    return await bridgeClient.sendRequest<JsonValue>(toolName, params);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Check if it's likely a connection error
    const connectionKeywords = [
      'Bridge not connected',
      'Receiving end does not exist',
      'Could not establish connection',
      'Connection lost',
      'Request timeout',
      'Connection closed'
    ];
    
    const isConnectionError = connectionKeywords.some(keyword => errorMsg.includes(keyword));

    if (isConnectionError) {
      throw new Error(
        `Bridge connection error: ${errorMsg}. Please ensure the bridge server is running (pnpm run bridge) and the Chrome extension is connected.`
      );
    } else {
      // For runtime errors (like Element not found), return the message as-is or with a minimal prefix
      // We explicitly avoid adding the "Please ensure..." message for these errors
      throw new Error(`Tool execution error: ${errorMsg}`);
    }
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'mcp-in-browser-server',
    version: '1.0.0',
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

  try {
    const result = await sendExtensionMessage(name, (args || {}) as Record<string, JsonValue>);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
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
  console.error('MCP in Browser server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
