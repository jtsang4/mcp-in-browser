export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableHistory: boolean;
  maxHistorySize: number;
}

export interface BridgeConfig {
  url: string;
  port: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageQueueLimit: number;
}

export interface AppConfig {
  logging: LoggingConfig;
  concurrency: number;
  bridge: BridgeConfig;
}

export function getDefaultConfig(): AppConfig {
  return {
    logging: {
      level: 'info',
      enableHistory: true,
      maxHistorySize: 1000,
    },
    concurrency: 5,
    bridge: {
      url: 'ws://localhost:37373',
      port: 37373,
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      messageQueueLimit: 100,
    },
  };
}
