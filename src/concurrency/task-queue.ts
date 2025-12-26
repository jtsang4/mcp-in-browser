/**
 * Task Queue with Concurrency Control and Per-Tab Limits
 */

import { logger } from '../core/logger';
import type { AppConfig } from '../core/config';

export interface QueuedTask<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  tabId?: number;
  priority?: number;
  enqueuedAt: number;
}

export class TaskQueue {
  private queue: QueuedTask[] = [];
  private running = new Set<string>();
  private perTabCount = new Map<number, number>();

  private config: Pick<AppConfig, 'concurrency'> = {
    concurrency: {
      maxPerTab: 3,
      maxGlobal: 10,
    },
  };

  constructor(config?: Pick<AppConfig, 'concurrency'>) {
    if (config) {
      this.config = config;
    }
  }

  setConfig(config: Pick<AppConfig, 'concurrency'>) {
    this.config = config;
  }

  async enqueue<T>(
    fn: () => Promise<T>,
    options?: {
      tabId?: number;
      priority?: number;
    }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        tabId: options?.tabId,
        priority: options?.priority ?? 0,
        enqueuedAt: Date.now(),
      };

      this.queue.push(task);
      this.sortQueue();
      this.process();
    });
  }

  private sortQueue() {
    // Sort by priority (higher first) and enqueue time (earlier first)
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  private canRun(task: QueuedTask): boolean {
    if (this.running.size >= this.config.concurrency.maxGlobal) {
      return false;
    }

    if (task.tabId !== undefined) {
      const runningInTab = this.perTabCount.get(task.tabId) ?? 0;
      if (runningInTab >= this.config.concurrency.maxPerTab) {
        return false;
      }
    }

    return true;
  }

  private async process() {
    while (this.queue.length > 0) {
      const task = this.queue[0];

      if (!this.canRun(task)) {
        // Wait for a slot to become available
        break;
      }

      // Remove from queue and start running
      this.queue.shift();
      this.running.add(task.id);

      if (task.tabId !== undefined) {
        const count = this.perTabCount.get(task.tabId) ?? 0;
        this.perTabCount.set(task.tabId, count + 1);
      }

      logger.debug('TaskQueue', `Starting task ${task.id}`, {
        tabId: task.tabId,
        queueSize: this.queue.length,
        running: this.running.size,
      });

      // Execute task
      this.executeTask(task).catch(error => {
        logger.error('TaskQueue', `Task ${task.id} failed`, { error });
      });
    }
  }

  private async executeTask(task: QueuedTask) {
    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      // Cleanup
      this.running.delete(task.id);
      if (task.tabId !== undefined) {
        const count = this.perTabCount.get(task.tabId) ?? 1;
        if (count <= 1) {
          this.perTabCount.delete(task.tabId);
        } else {
          this.perTabCount.set(task.tabId, count - 1);
        }
      }

      logger.debug('TaskQueue', `Completed task ${task.id}`, {
        tabId: task.tabId,
        running: this.running.size,
      });

      // Process next task
      this.process();
    }
  }

  getStatus() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      perTab: Object.fromEntries(this.perTabCount),
    };
  }

  clear() {
    // Reject all queued tasks
    for (const task of this.queue) {
      task.reject(new Error('Queue cleared'));
    }
    this.queue = [];

    logger.info('TaskQueue', 'Cleared all queued tasks', {
      running: this.running.size,
    });
  }
}

export const globalTaskQueue = new TaskQueue();
