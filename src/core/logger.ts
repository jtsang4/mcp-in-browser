/**
 * Structured Logging System
 */

import type { AppConfig } from './config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  requestId?: string;
}

class Logger {
  private config: Pick<AppConfig, 'logging'> = {
    logging: {
      level: 'info',
      enableTracing: true,
    },
  };

  private levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };

  private logHistory: LogEntry[] = [];
  private maxHistory = 1000;

  setConfig(config: Pick<AppConfig, 'logging'>) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    const currentLevel = this.levelMap[this.config.logging.level] || LogLevel.INFO;
    return level >= currentLevel;
  }

  private log(
    level: LogLevel,
    context: string,
    message: string,
    data?: Record<string, unknown>,
    requestId?: string
  ) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context,
      message,
      data,
      requestId,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory.shift();
    }

    // Console output
    const prefix = `[${LogLevel[level]}] [${context}]`;
    const trace = requestId ? ` [req:${requestId.substring(0, 8)}]` : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix + trace, message, data ?? '');
        break;
      case LogLevel.INFO:
        console.info(prefix + trace, message, data ?? '');
        break;
      case LogLevel.WARN:
        console.warn(prefix + trace, message, data ?? '');
        break;
      case LogLevel.ERROR:
        console.error(prefix + trace, message, data ?? '');
        break;
    }
  }

  debug(context: string, message: string, data?: Record<string, unknown>, requestId?: string) {
    this.log(LogLevel.DEBUG, context, message, data, requestId);
  }

  info(context: string, message: string, data?: Record<string, unknown>, requestId?: string) {
    this.log(LogLevel.INFO, context, message, data, requestId);
  }

  warn(context: string, message: string, data?: Record<string, unknown>, requestId?: string) {
    this.log(LogLevel.WARN, context, message, data, requestId);
  }

  error(context: string, message: string, data?: Record<string, unknown>, requestId?: string) {
    this.log(LogLevel.ERROR, context, message, data, requestId);
  }

  getHistory(filter?: { level?: LogLevel; context?: string; requestId?: string }): LogEntry[] {
    return this.logHistory.filter(entry => {
      if (filter?.level !== undefined && entry.level !== filter.level) return false;
      if (filter?.context !== undefined && entry.context !== filter.context) return false;
      if (filter?.requestId !== undefined && entry.requestId !== filter.requestId) return false;
      return true;
    });
  }

  clearHistory() {
    this.logHistory = [];
  }
}

export const logger = new Logger();
