#!/usr/bin/env node

/**
 * MCP Server for MCP in Browser
 *
 * This MCP server provides tools for browser automation through the browser extension.
 * It communicates with the extension via a WebSocket bridge.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';

// WebSocket bridge connection
const BRIDGE_PORT = 37373;
let bridgeWs: WebSocket | null = null;
let bridgeReconnectTimer: ReturnType<typeof setInterval> | null = null;

// Connect to the WebSocket bridge
function connectToBridge() {
  if (bridgeWs?.readyState === WebSocket.OPEN) {
    return;
  }

  console.error(`[MCP] Connecting to bridge at ws://localhost:${BRIDGE_PORT}...`);

  bridgeWs = new WebSocket(`ws://localhost:${BRIDGE_PORT}`);

  bridgeWs.on('open', () => {
    console.error(`[MCP] Connected to bridge`);
    // Identify ourselves as the MCP server
    bridgeWs?.send(JSON.stringify({ type: 'hello', client: 'mcp-server' }));
  });

  bridgeWs.on('error', (error) => {
    console.error(`[MCP] Bridge connection error:`, error.message);
  });

  bridgeWs.on('close', () => {
    console.error(`[MCP] Bridge connection closed`);
    bridgeWs = null;
    // Attempt to reconnect after 2 seconds
    if (!bridgeReconnectTimer) {
      bridgeReconnectTimer = setInterval(() => {
        if (!bridgeWs || bridgeWs.readyState === WebSocket.CLOSED) {
          console.error(`[MCP] Attempting to reconnect to bridge...`);
          connectToBridge();
        } else {
          if (bridgeReconnectTimer) {
            clearInterval(bridgeReconnectTimer);
            bridgeReconnectTimer = null;
          }
        }
      }, 2000);
    }
  });
}

// Start connection
connectToBridge();

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
async function sendExtensionMessage(toolName: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // Check if bridge is connected
    if (!bridgeWs || bridgeWs.readyState !== WebSocket.OPEN) {
      reject(new Error('Bridge not connected. Please ensure the bridge server is running (pnpm run bridge) and the Chrome extension is connected.'));
      return;
    }

    // Set up response handler
    const responseHandler = (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'response' && message.id === id) {
          bridgeWs?.removeListener('message', responseHandler);
          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve(message.data);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    bridgeWs.on('message', responseHandler);

    // Set timeout
    const timeout = setTimeout(() => {
      bridgeWs?.removeListener('message', responseHandler);
      reject(new Error('Request timeout'));
    }, 30000);

    // Send the request
    bridgeWs.send(JSON.stringify({
      type: 'tool_call',
      tool: toolName,
      params,
      id,
    }));

    // Clear timeout when resolved
    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
  });
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
    const result = await sendExtensionMessage(name, args || {});

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
