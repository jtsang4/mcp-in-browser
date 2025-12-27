/**
 * Unified Storage Module
 * Uses @webext-core/storage for type-safe extension storage
 */

import { defineExtensionStorage } from '@webext-core/storage';
import { browser } from 'wxt/browser';
import type { LoggingConfig, BridgeConfig, AppConfig, TimeoutConfig, ConcurrencyConfig } from '../../types/config';
import type { JsonValue } from '../../types';

// Log entry type
export interface LogEntry {
  timestamp: number;
  level: string;
  module: string;
  action: string;
  data?: JsonValue;
}

// Define all storage items
interface StorageItems {
  config: AppConfig;
  logs: LogEntry[];
}

// Default configuration (matching types/config.ts)
export const defaultAppConfig: AppConfig = {
  bridge: {
    url: 'ws://localhost:37373',
    port: 37373,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    messageQueueLimit: 100,
  },
  timeouts: {
    contentScriptResponse: 30000,
    elementWait: 10000,
    pageLoad: 30000,
    networkIdle: 5000,
  },
  concurrency: {
    maxPerTab: 3,
    maxGlobal: 10,
  },
  logging: {
    level: 'info',
    enableTracing: true,
  },
};

// Create typed storage instance
const storage = defineExtensionStorage<StorageItems>(browser.storage.local);

// Config management functions
export async function getConfig(): Promise<AppConfig> {
  try {
    const stored = await storage.getItem('config');
    return stored ?? defaultAppConfig;
  } catch {
    return defaultAppConfig;
  }
}

export async function updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
  const current = await getConfig();
  const newConfig = {
    ...current,
    ...updates,
    // Deep merge nested objects
    ...(updates.logging && { logging: { ...current.logging, ...updates.logging } }),
    ...(updates.bridge && { bridge: { ...current.bridge, ...updates.bridge } }),
    ...(updates.timeouts && { timeouts: { ...current.timeouts, ...updates.timeouts } }),
    ...(updates.concurrency && { concurrency: { ...current.concurrency, ...updates.concurrency } }),
  };
  await storage.setItem('config', newConfig);
  return newConfig;
}

export async function resetConfig(): Promise<void> {
  await storage.removeItem('config');
}

// Logs management functions
export async function getLogs(limit?: number): Promise<LogEntry[]> {
  try {
    const logs = await storage.getItem('logs');
    if (!logs) return [];
    return limit ? logs.slice(-limit) : logs;
  } catch {
    return [];
  }
}

export async function addLog(log: LogEntry): Promise<void> {
  try {
    const logs = await storage.getItem('logs') || [];
    logs.push(log);

    // Trim if exceeds max size
    const maxSize = 1000;
    if (logs.length > maxSize) {
      logs.splice(0, logs.length - maxSize);
    }

    await storage.setItem('logs', logs);
  } catch (error) {
    console.warn('[Storage] Failed to add log:', error);
  }
}

export async function clearLogs(): Promise<void> {
  await storage.removeItem('logs');
}

// Storage watchers
export function onConfigChanged(callback: (newConfig: AppConfig) => void) {
  return storage.onChange('config', (newValue) => {
    callback(newValue);
  });
}
