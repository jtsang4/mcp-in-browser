export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableTracing: boolean;
}

export interface BridgeConfig {
  url: string;
  port: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageQueueLimit: number;
}

export interface TimeoutConfig {
  contentScriptResponse: number;
  elementWait: number;
  pageLoad: number;
  networkIdle: number;
}

export interface ConcurrencyConfig {
  maxPerTab: number;
  maxGlobal: number;
}

export interface AppConfig {
  bridge: BridgeConfig;
  timeouts: TimeoutConfig;
  concurrency: ConcurrencyConfig;
  logging: LoggingConfig;
}

export function getDefaultConfig(): AppConfig {
  return {
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
}
