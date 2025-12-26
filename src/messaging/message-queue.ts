/**
 * Message Queue for Pending Requests with TTL and Size Limits
 */

import { logger } from '../core/logger';
import { generateId } from '../core/id-generator';
import type { AppConfig } from '../core/config';

export interface PendingRequest<T = unknown> {
  id: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  timestamp: number;
  data?: Record<string, unknown>;
}

export class MessageQueue {
  private pending = new Map<string, PendingRequest>();
  private config: Pick<AppConfig, 'bridge'> = {
    bridge: {
      url: 'ws://localhost:37373',
      port: 37373,
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      messageQueueLimit: 100,
    },
  };

  constructor(config?: Pick<AppConfig, 'bridge'>) {
    if (config) {
      this.config = config;
    }
  }

  setConfig(config: Pick<AppConfig, 'bridge'>) {
    this.config = config;
  }

  create<T>(timeoutMs: number, data?: Record<string, unknown>): PendingRequest<T> {
    // Clean up expired requests
    this.cleanup();

    // Check queue size limit
    if (this.pending.size >= this.config.bridge.messageQueueLimit) {
      logger.warn('MessageQueue', 'Queue limit reached, removing oldest request');
      this.removeOldest();
    }

    const id = generateId();
    const timeoutHandle = setTimeout(() => {
      this.resolve(id, null, new Error('Request timeout'));
    }, timeoutMs);

    const request: PendingRequest<T> = {
      id,
      resolve: () => {},
      reject: () => {},
      timeout: timeoutHandle,
      timestamp: Date.now(),
      data,
    };

    this.pending.set(id, request);
    logger.debug('MessageQueue', `Created pending request ${id}`, data);

    return request;
  }

  resolve<T>(id: string, value: T, error?: Error | null) {
    const request = this.pending.get(id);
    if (!request) {
      logger.warn('MessageQueue', `No pending request found for id ${id}`);
      return false;
    }

    clearTimeout(request.timeout);
    this.pending.delete(id);

    if (error) {
      request.reject(error);
      logger.debug('MessageQueue', `Resolved request ${id} with error`, { error: error.message });
    } else {
      (request as PendingRequest<T>).resolve(value);
      logger.debug('MessageQueue', `Resolved request ${id} successfully`);
    }

    return true;
  }

  remove(id: string): boolean {
    const request = this.pending.get(id);
    if (!request) return false;

    clearTimeout(request.timeout);
    this.pending.delete(id);
    logger.debug('MessageQueue', `Removed request ${id}`);
    return true;
  }

  removeOldest(): void {
    let oldestId: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [id, request] of this.pending.entries()) {
      if (request.timestamp < oldestTimestamp) {
        oldestTimestamp = request.timestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.remove(oldestId);
    }
  }

  private cleanup(): void {
    // Remove requests older than 5 minutes (shouldn't happen, but safety net)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;

    for (const [id, request] of this.pending.entries()) {
      if (now - request.timestamp > maxAge) {
        this.remove(id);
      }
    }
  }

  clear(): void {
    for (const [id, request] of this.pending.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('Queue cleared'));
    }
    this.pending.clear();
    logger.debug('MessageQueue', 'Cleared all pending requests');
  }

  size(): number {
    return this.pending.size;
  }

  getAllPending(): string[] {
    return Array.from(this.pending.keys());
  }
}

export const globalMessageQueue = new MessageQueue();
