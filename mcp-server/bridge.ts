#!/usr/bin/env node

/**
 * WebSocket Bridge for Claude in Chrome
 *
 * This bridge connects the MCP server (Node.js) with the Chrome extension.
 * Both the extension and MCP server connect as WebSocket clients, and the bridge
 * forwards messages between them.
 *
 * Usage: node bridge.ts [port]
 * Default port: 37373
 */

import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';

const PORT = process.argv[2] ? parseInt(process.argv[2], 10) : 37373;

// Store for connected clients
const extensionClients = new Set<WebSocket>();
let mcpServerClient: WebSocket | null = null;

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.error(`[Bridge] WebSocket server started on ws://localhost:${PORT}`);
console.error(`[Bridge] Waiting for clients to connect...`);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.error(`[Bridge] Client connected: ${clientIp}`);

  // Track client type
  let clientType: 'extension' | 'mcp-server' | null = null;

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      // First message identifies the client
      if (message.type === 'hello') {
        if (message.client === 'extension') {
          clientType = 'extension';
          extensionClients.add(ws);
          console.error(`[Bridge] Extension client registered`);
          ws.send(JSON.stringify({ type: 'hello', status: 'connected' }));
          return;
        } else if (message.client === 'mcp-server') {
          clientType = 'mcp-server';
          mcpServerClient = ws;
          console.error(`[Bridge] MCP server client registered`);
          ws.send(JSON.stringify({ type: 'hello', status: 'connected' }));
          return;
        }
      }

      // Handle tool_call from MCP server -> forward to extension
      if (message.type === 'tool_call' && clientType === 'mcp-server') {
        console.error(`[Bridge] Forwarding tool_call to extension:`, message.tool);
        let sent = false;
        for (const client of extensionClients) {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(message));
            sent = true;
          }
        }
        if (!sent) {
          console.error(`[Bridge] No extension clients available to forward tool_call`);
        }
        return;
      }

      // Handle response from extension -> forward to MCP server
      if (message.type === 'response' && clientType === 'extension') {
        console.error(`[Bridge] Forwarding response to MCP server, id:`, message.id);
        if (mcpServerClient && mcpServerClient.readyState === 1) {
          mcpServerClient.send(JSON.stringify(message));
        } else {
          console.error(`[Bridge] No MCP server client to forward response to`);
        }
        return;
      }

      console.error(`[Bridge] Received message:`, message);
    } catch (error) {
      console.error(`[Bridge] Error parsing message:`, error);
    }
  });

  ws.on('close', () => {
    if (clientType === 'extension') {
      extensionClients.delete(ws);
      console.error(`[Bridge] Extension client disconnected`);
    } else if (clientType === 'mcp-server') {
      mcpServerClient = null;
      console.error(`[Bridge] MCP server client disconnected`);
    }
    console.error(`[Bridge] Client disconnected: ${clientIp}`);
  });

  ws.on('error', (error) => {
    console.error(`[Bridge] WebSocket error:`, error);
  });
});

// Keep the process running
console.error(`[Bridge] Bridge server is running. Press Ctrl+C to stop.`);

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.error(`[Bridge] Shutting down...`);
  wss.close(() => {
    process.exit(0);
  });
});
