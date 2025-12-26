/**
 * Application Configuration
 */
import { browser } from 'wxt/browser';

export interface AppConfig {
  bridge: {
    url: string;
    port: number;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    messageQueueLimit: number;
  };
  timeouts: {
    contentScriptResponse: number;
    elementWait: number;
    pageLoad: number;
    networkIdle: number;
  };
  concurrency: {
    maxPerTab: number;
    maxGlobal: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableTracing: boolean;
  };
}

export const defaultConfig: AppConfig = {
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

// Load config from storage, merge with defaults
export async function loadConfig(): Promise<AppConfig> {
  try {
    const stored = await browser.storage.local.get('config');
    if (stored.config) {
      return { ...defaultConfig, ...stored.config };
    }
  } catch (error) {
    console.warn('[Config] Failed to load stored config:', error);
  }
  return defaultConfig;
}

// Save config to storage
export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const current = await loadConfig();
    const merged = { ...current, ...config };
    await browser.storage.local.set({ config: merged });
  } catch (error) {
    console.warn('[Config] Failed to save config:', error);
  }
}
