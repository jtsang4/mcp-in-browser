/**
 * Cache Manager with TTL and Size Limits
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccess: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  maxAge?: number;
}

export class CacheManager<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      defaultTTL: options.defaultTTL ?? 5 * 60 * 1000, // 5 minutes
      maxAge: options.maxAge ?? 30 * 60 * 1000, // 30 minutes
    };
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Enforce max size with LRU eviction
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now(),
    });
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get multiple keys
   */
  getMany(keys: string[]): Array<{ key: string; value: T | undefined }> {
    return keys.map((key) => ({ key, value: this.get(key) }));
  }

  /**
   * Set multiple keys
   */
  setMany(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Delete multiple keys
   */
  deleteMany(keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: this.calculateHitRate(),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp,
        expired: this.isExpired(entry),
      })),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry) || Date.now() - entry.timestamp > this.options.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   */
  values(): T[] {
    const result: T[] = [];

    for (const entry of this.cache.values()) {
      if (!this.isExpired(entry)) {
        result.push(entry.value);
      }
    }

    return result;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private hitCount = 0;
  private missCount = 0;

  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? this.hitCount / total : 0;
  }

  /**
   * Track cache hits/misses manually if needed
   */
  trackHit() {
    this.hitCount++;
  }

  trackMiss() {
    this.missCount++;
  }

  resetStats() {
    this.hitCount = 0;
    this.missCount = 0;
  }
}

/**
 * Global cache instances
 */
export const elementCache = new CacheManager<{ selector: string; info: unknown }>({
  maxSize: 50,
  defaultTTL: 60 * 1000, // 1 minute
});

export const pageContentCache = new CacheManager<unknown>({
  maxSize: 20,
  defaultTTL: 30 * 1000, // 30 seconds
});
