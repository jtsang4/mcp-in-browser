/**
 * Unified Storage Module
 * Provides helper functions for managing extension storage
 * Currently uses the existing src/core/config implementation
 */

import type { BridgeConfig, LoggingConfig, AppConfig } from '../../types/config';

// Bridge config helpers
export async function loadBridgeConfig(): Promise<BridgeConfig> {
  return {
    url: 'ws://localhost:37373',
    port: 37373,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    messageQueueLimit: 100,
  };
}

export async function saveBridgeConfig(_config: Partial<BridgeConfig>): Promise<void> {
  // Implementation would use browser.storage.local
  // For now, the actual storage is handled in src/core/config.ts
}

// Logging config helpers
export async function loadLoggingConfig(): Promise<LoggingConfig> {
  return {
    level: 'info',
    enableHistory: true,
    maxHistorySize: 1000,
  };
}

export async function saveLoggingConfig(_config: Partial<LoggingConfig>): Promise<void> {
  // Placeholder - actual implementation in src/core/config.ts
}

// App config helpers
export async function loadAppConfig(): Promise<AppConfig> {
  return {
    logging: await loadLoggingConfig(),
    concurrency: 5,
    bridge: await loadBridgeConfig(),
  };
}

export async function saveAppConfig(config: Partial<AppConfig>): Promise<void> {
  if (config.bridge) {
    await saveBridgeConfig(config.bridge);
  }
  if (config.logging) {
    await saveLoggingConfig(config.logging);
  }
}

// Watch functions (placeholder - would use browser.storage.onChanged)
export function watchBridgeConfig(_callback: (config: BridgeConfig) => void): () => void {
  return () => {};
}

export function watchLoggingConfig(_callback: (config: LoggingConfig) => void): () => void {
  return () => {};
}

export function watchAppConfig(_callback: (config: AppConfig) => void): () => void {
  return () => {};
}
