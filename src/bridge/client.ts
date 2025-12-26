/**
 * WebSocket Bridge Client - Unified implementation for both extension and MCP server
 */

import WebSocket from 'ws';
import { logger } from '../core/logger';
import { AppError, ErrorCode } from '../core/errors';
import { generateId } from '../core/id-generator';
import type { AppConfig } from '../core/config';
import type { JsonValue } from '../../types';

export interface BridgeMessage {
  type: 'hello' | 'tool_call' | 'response' | 'error';
  id?: string;
  tool?: string;
  params?: Record<string, JsonValue>;
  data?: JsonValue | null;
  error?: string;
  client?: 'extension' | 'mcp-server';
  status?: string;
}

export type BridgeClientType = 'extension' | 'mcp-server';

export class BridgeClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private messageQueue: string[] = [];
  private pendingRequests = new Map<string, {
    resolve: (value: JsonValue | null) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  private config: Pick<AppConfig, 'bridge'> = {
    bridge: {
      url: 'ws://localhost:37373',
      port: 37373,
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      messageQueueLimit: 100,
    },
  };

  private messageHandler: ((message: BridgeMessage) => Promise<void> | void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;

  constructor(
    private clientType: BridgeClientType,
    config?: Pick<AppConfig, 'bridge'>
  ) {
    if (config) {
      this.config = config;
    }
  }

  setConfig(config: Pick<AppConfig, 'bridge'>) {
    this.config = config;
  }

  setMessageHandler(handler: (message: BridgeMessage) => Promise<void> | void) {
    this.messageHandler = handler;
  }

  onConnected(callback: () => void) {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: () => void) {
    this.onDisconnectedCallback = callback;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const url = this.config.bridge.url;

    logger.info('BridgeClient', `Connecting to bridge at ${url}`, {
      clientType: this.clientType,
    });

    try {
      // Node.js WebSocket
      this.ws = new WebSocket(url) as WebSocket;

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error('BridgeClient', 'Failed to create WebSocket connection', { error });
      this.scheduleReconnect();
    }
  }

  /**
   * Check if the WebSocket is ready
   */
  private isOpen(ws: WebSocket | null): boolean {
    if (!ws) return false;
    return ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    logger.info('BridgeClient', 'Disconnected from bridge');
  }

  private handleOpen() {
    logger.info('BridgeClient', 'Connected to bridge', { clientType: this.clientType });
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Send hello message
    this.sendMessage({
      type: 'hello',
      client: this.clientType,
    });

    // Flush queued messages
    this.flushMessageQueue();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.onConnectedCallback) {
      this.onConnectedCallback();
    }
  }

  private handleMessage(event: { data: WebSocket.Data | string }) {
    try {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      const message: BridgeMessage = JSON.parse(data);

      logger.debug('BridgeClient', 'Received message', {
        type: message.type,
        id: message.id,
        tool: message.tool,
      });

      // Handle hello acknowledgment
      if (message.type === 'hello' && message.status === 'connected') {
        logger.info('BridgeClient', 'Bridge acknowledged connection');
        return;
      }

      // Handle responses to our requests
      if (message.type === 'response' && message.id) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);

          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.data ?? null);
          }
        }
        return;
      }

      // Handle errors
      if (message.type === 'error') {
        logger.error('BridgeClient', 'Received error from bridge', {
          error: message.error,
          id: message.id,
        });
        return;
      }

      // Custom message handler
      if (this.messageHandler) {
        this.messageHandler(message);
      }
    } catch (error) {
      logger.error('BridgeClient', 'Failed to parse message', { error });
    }
  }

  private handleError(event: WebSocket.ErrorEvent) {
    logger.error('BridgeClient', 'WebSocket error', { error: event.message });
    this.isConnected = false;
  }

  private handleClose() {
    logger.warn('BridgeClient', 'Bridge connection closed');
    this.isConnected = false;
    this.ws = null;

    if (this.onDisconnectedCallback) {
      this.onDisconnectedCallback();
    }

    // Schedule reconnect
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.bridge.maxReconnectAttempts) {
      logger.error('BridgeClient', 'Max reconnect attempts reached, giving up');
      return;
    }

    if (!this.reconnectTimer) {
      this.reconnectTimer = setInterval(() => {
        if (!this.isConnected) {
          this.reconnectAttempts++;
          logger.info('BridgeClient', `Reconnecting... (attempt ${this.reconnectAttempts})`);
          this.connect();
        } else {
          if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        }
      }, this.config.bridge.reconnectInterval);
    }
  }

  private safeSend(message: BridgeMessage): boolean {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('BridgeClient', 'Failed to send message', { error, message });
      return false;
    }
  }

  sendMessage(message: BridgeMessage): void {
    if (this.safeSend(message)) {
      return;
    }

    // Queue message if not connected
    if (this.messageQueue.length >= this.config.bridge.messageQueueLimit) {
      logger.warn('BridgeClient', 'Message queue limit reached, dropping oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push(JSON.stringify(message));
    logger.debug('BridgeClient', 'Message queued (waiting for connection)', { type: message.type });
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        const parsed: BridgeMessage = JSON.parse(message);
        if (!this.safeSend(parsed)) {
          // Put it back and stop
          this.messageQueue.unshift(message);
          break;
        }
      } catch (error) {
        logger.error('BridgeClient', 'Failed to parse queued message', { error });
      }
    }

    if (this.messageQueue.length === 0) {
      logger.debug('BridgeClient', 'All queued messages flushed');
    }
  }

  async sendRequest<T>(
    tool: string,
    params: Record<string, JsonValue>,
    timeout = 30000
  ): Promise<T> {
    if (!this.isConnected) {
      throw new AppError(ErrorCode.BRIDGE_NOT_CONNECTED, 'Bridge not connected');
    }

    const id = generateId('req');

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: JsonValue | null) => void,
        reject,
        timeout: timeoutHandle,
      });

      this.sendMessage({
        type: 'tool_call',
        id,
        tool,
        params,
      });
    });
  }

  sendResponse(id: string, data: JsonValue | null, error?: string) {
    this.sendMessage({
      type: 'response',
      id,
      data,
      error,
    });
  }

  isConnectedToBridge(): boolean {
    return this.isConnected;
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  clearQueue() {
    this.messageQueue = [];

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    }
    this.pendingRequests.clear();
  }
}

export function createBridgeClient(
  clientType: BridgeClientType,
  config?: Pick<AppConfig, 'bridge'>
): BridgeClient {
  return new BridgeClient(clientType, config);
}
