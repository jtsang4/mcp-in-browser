/**
 * WebSocket Client for MCP in Browser Extension
 *
 * This service connects to the WebSocket bridge and handles tool calls from the MCP server.
 */

const BRIDGE_URL = 'ws://localhost:37373';
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setInterval> | null = null;
let isConnected = false;

// Queue for messages to send when connection is ready
const messageQueue: string[] = [];

// Map to track pending requests
const pendingRequests = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/**
 * Safely send a message through the WebSocket
 */
function safeSend(message: string): boolean {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(message);
      return true;
    } catch (error) {
      console.error('[Extension] Error sending message:', error);
      return false;
    }
  }
  return false;
}

/**
 * Send a message, queuing it if not ready
 */
function sendMessage(message: string): void {
  if (safeSend(message)) {
    // Message sent successfully
    return;
  }

  // Queue the message for when connection is ready
  messageQueue.push(message);
  console.log('[Extension] Message queued (waiting for connection)');
}

/**
 * Flush all queued messages
 */
function flushMessageQueue(): void {
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    if (!safeSend(message!)) {
      // Put it back and stop
      messageQueue.unshift(message!);
      break;
    }
  }
}

/**
 * Connect to the WebSocket bridge
 */
export function connectToBridge() {
  // Don't reconnect if already connecting or connected
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  console.log('[Extension] Connecting to bridge at', BRIDGE_URL);

  ws = new WebSocket(BRIDGE_URL);

  ws.onopen = () => {
    console.log('[Extension] Connected to bridge');
    isConnected = true;

    // Send hello message
    sendMessage(JSON.stringify({ type: 'hello', client: 'extension' }));

    // Flush any queued messages
    flushMessageQueue();

    // Clear reconnect timer
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      // Handle hello acknowledgment
      if (message.type === 'hello' && message.status === 'connected') {
        console.log('[Extension] Bridge acknowledged connection');
        return;
      }

      // Handle tool calls from MCP server
      if (message.type === 'tool_call') {
        handleToolCall(message);
        return;
      }

      // Handle responses to our requests
      if (message.type === 'response' && message.id) {
        const pending = pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(message.id);
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.data);
          }
        }
        return;
      }

      console.log('[Extension] Received message:', message);
    } catch (error) {
      console.error('[Extension] Error parsing message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('[Extension] WebSocket error:', error);
    isConnected = false;
  };

  ws.onclose = () => {
    console.log('[Extension] Bridge connection closed');
    isConnected = false;
    ws = null;

    // Attempt to reconnect after 2 seconds
    if (!reconnectTimer) {
      reconnectTimer = setInterval(() => {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
          console.log('[Extension] Attempting to reconnect to bridge...');
          connectToBridge();
        } else {
          if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
          }
        }
      }, 2000);
    }
  };
}

/**
 * Handle tool calls from the MCP server
 */
async function handleToolCall(message: { tool: string; params: Record<string, unknown>; id: string }) {
  const { tool, params, id } = message;

  try {
    let result: unknown;

    switch (tool) {
      case 'navigate':
        result = await chrome.tabs.create({ url: params.url as string });
        break;

      case 'click':
      case 'fill':
      case 'get_page_content':
      case 'query_selector':
      case 'query_selector_all':
      case 'get_form_values':
        // These require content script - send to current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          throw new Error('No active tab');
        }
        result = await sendToContentScript(tab.id, tool, params);
        break;

      case 'screenshot': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.windowId) {
          throw new Error('No active window');
        }
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: (params.format as 'png' | 'jpeg') || 'png',
          quality: (params.quality as number) || 90,
        });
        result = { success: true, screenshot: { dataUrl, width: 0, height: 0 } };
        break;
      }

      case 'list_tabs': {
        const tabs = await chrome.tabs.query(params?.activeOnly ? { active: true } : {});
        result = tabs.map(tab => ({
          id: tab.id!,
          url: tab.url || '',
          title: tab.title || '',
          active: tab.active,
        }));
        break;
      }

      case 'activate_tab': {
        const tabId = params.tabId as number;
        await chrome.tabs.update(tabId, { active: true });
        const tab = await chrome.tabs.get(tabId);
        await chrome.windows.update(tab.windowId!, { focused: true });
        result = { success: true };
        break;
      }

      case 'reload': {
        const tabId = params.tabId as number | undefined;
        if (tabId !== undefined) {
          await chrome.tabs.reload(tabId);
        } else {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            await chrome.tabs.reload(tab.id);
          }
        }
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }

    // Send response back to bridge
    sendMessage(JSON.stringify({
      type: 'response',
      id,
      data: result,
    }));
  } catch (error) {
    // Send error back to bridge
    sendMessage(JSON.stringify({
      type: 'response',
      id,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

/**
 * Send a message to a content script and wait for response
 */
function sendToContentScript(tabId: number, tool: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Content script response timeout'));
    }, 10000);

    pendingRequests.set(id, { resolve, reject, timeout });

    // Listen for response
    const responseListener = (message: any) => {
      if (message.type === 'response' && message.id === id) {
        chrome.runtime.onMessage.removeListener(responseListener);
        clearTimeout(timeout);
        pendingRequests.delete(id);
        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message.data);
        }
      }
    };

    chrome.runtime.onMessage.addListener(responseListener);

    // Send message to content script
    chrome.tabs.sendMessage(tabId, {
      type: tool,
      id,
      ...params,
    }).catch((error) => {
      chrome.runtime.onMessage.removeListener(responseListener);
      clearTimeout(timeout);
      pendingRequests.delete(id);
      reject(error);
    });
  });
}

/**
 * Check if connected to the bridge
 */
export function isBridgeConnected(): boolean {
  return isConnected && ws?.readyState === WebSocket.OPEN;
}

// Auto-connect on service worker startup
connectToBridge();
