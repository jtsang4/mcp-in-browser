/**
 * Test Helpers and Mocks
 */

import type { PageContent, ElementInfo } from '../content/page-info';
import type { TabInfo } from '../../types/tools';

/**
 * Mock Chrome APIs for testing
 */
export class MockChrome {
  private tabs: Map<number, TabInfo> = new Map();
  private nextTabId = 1;

  createMockTab(url: string, active = true): TabInfo {
    const tab: TabInfo = {
      id: this.nextTabId++,
      url,
      title: `Mock Tab for ${url}`,
      active,
    };
    this.tabs.set(tab.id, tab);
    return tab;
  }

  getMockTabs(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  getMockTab(id: number): TabInfo | undefined {
    return this.tabs.get(id);
  }

  clearMockTabs() {
    this.tabs.clear();
    this.nextTabId = 1;
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  static generatePageContent(overrides?: Partial<PageContent>): PageContent {
    return {
      url: 'https://example.com',
      title: 'Example Page',
      text: 'Sample page content',
      html: '<html><body>Sample content</body></html>',
      timestamp: Date.now(),
      ...overrides,
    };
  }

  static generateElementInfo(overrides?: Partial<ElementInfo>): ElementInfo {
    return {
      tagName: 'DIV',
      id: 'test-id',
      className: 'test-class',
      textContent: 'Sample element text',
      attributes: { id: 'test-id', class: 'test-class' },
      bounds: { x: 0, y: 0, width: 100, height: 50, top: 0, left: 0, bottom: 50, right: 100 },
      visible: true,
      ...overrides,
    };
  }

  static generateTabInfo(overrides?: Partial<TabInfo>): TabInfo {
    return {
      id: 1,
      url: 'https://example.com',
      title: 'Example Tab',
      active: true,
      ...overrides,
    };
  }
}

/**
 * Assertion helpers
 */
export class Assertions {
  static assertPageContent(actual: PageContent, expected: Partial<PageContent>): void {
    if (expected.url !== undefined && actual.url !== expected.url) {
      throw new Error(`Expected URL ${expected.url}, got ${actual.url}`);
    }
    if (expected.title !== undefined && actual.title !== expected.title) {
      throw new Error(`Expected title ${expected.title}, got ${actual.title}`);
    }
  }

  static assertElementInfo(actual: ElementInfo, expected: Partial<ElementInfo>): void {
    if (expected.tagName !== undefined && actual.tagName !== expected.tagName) {
      throw new Error(`Expected tagName ${expected.tagName}, got ${actual.tagName}`);
    }
    if (expected.visible !== undefined && actual.visible !== expected.visible) {
      throw new Error(`Expected visible ${expected.visible}, got ${actual.visible}`);
    }
  }

  static assertTabInfo(actual: TabInfo, expected: Partial<TabInfo>): void {
    if (expected.url !== undefined && actual.url !== expected.url) {
      throw new Error(`Expected URL ${expected.url}, got ${actual.url}`);
    }
    if (expected.active !== undefined && actual.active !== expected.active) {
      throw new Error(`Expected active ${expected.active}, got ${actual.active}`);
    }
  }
}

/**
 * Test runner
 */
export class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private results: Array<{ name: string; passed: boolean; error?: string; duration: number }> = [];

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\nRunning ${this.tests.length} tests...\n`);

    for (const test of this.tests) {
      const startTime = Date.now();

      try {
        await test.fn();
        this.results.push({
          name: test.name,
          passed: true,
          duration: Date.now() - startTime,
        });
        console.log(`✓ ${test.name} (${Date.now() - startTime}ms)`);
      } catch (error) {
        this.results.push({
          name: test.name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
        console.log(`✗ ${test.name} (${Date.now() - startTime}ms)`);
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.printSummary();
  }

  private printSummary() {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests: ${passed} passed, ${failed} failed`);
    console.log(`Duration: ${totalDuration}ms`);
    console.log(`${'='.repeat(50)}\n`);

    if (failed > 0) {
      console.log('Failed tests:');
      this.results.filter((r) => !r.passed).forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
  }

  getResults() {
    return this.results;
  }
}

/**
 * Async test utilities
 */
export class AsyncTestUtils {
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async waitFor<T>(
    condition: () => T | null | false,
    timeout = 5000,
    pollInterval = 100
  ): Promise<T> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = condition();
      if (result !== null && result !== false) {
        return result as T;
      }
      await this.delay(pollInterval);
    }

    throw new Error(`Wait condition not met within ${timeout}ms`);
  }

  static async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      ),
    ]);
  }
}
