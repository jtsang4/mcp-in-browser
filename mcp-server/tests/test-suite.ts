/**
 * Test Suite for MCP in Browser
 */

import { TestRunner, Assertions, TestDataGenerator } from '../../src/testing/helpers';
import { Schemas } from '../../src/core/validator';
import { CacheManager } from '../../src/cache/cache-manager';
import { ElementLocator } from '../../src/content/locators';

async function runTests() {
  const runner = new TestRunner();

  // Validator tests
  runner.test('Schema.navigate - valid input', () => {
    const result = Schemas.navigate.validate({
      url: 'https://example.com',
      tabId: 1,
    });

    Assertions.assertTrue(result.success, 'Schema validation should succeed');
    Assertions.assertTrue(
      result.data?.url === 'https://example.com',
      'URL should match'
    );
  });

  runner.test('Schema.navigate - missing required url', () => {
    const result = Schemas.navigate.validate({});

    Assertions.assertTrue(!result.success, 'Schema validation should fail');
    Assertions.assertTrue(
      result.error?.includes('url'),
      'Error should mention url'
    );
  });

  runner.test('Schema.click - valid input', () => {
    const result = Schemas.click.validate({
      selector: '#button',
      tabId: 2,
    });

    Assertions.assertTrue(result.success, 'Schema validation should succeed');
  });

  runner.test('Schema.screenshot - valid with quality', () => {
    const result = Schemas.screenshot.validate({
      format: 'png',
      quality: 85,
    });

    Assertions.assertTrue(result.success, 'Schema validation should succeed');
  });

  runner.test('Schema.screenshot - invalid format', () => {
    const result = Schemas.screenshot.validate({
      format: 'gif',
    });

    Assertions.assertTrue(!result.success, 'Schema validation should fail');
  });

  // Cache tests
  runner.test('CacheManager - set and get', () => {
    const cache = new CacheManager<string>({ maxSize: 10, defaultTTL: 1000 });
    cache.set('key1', 'value1');

    const result = cache.get('key1');
    Assertions.assertTrue(result === 'value1', 'Value should match');
  });

  runner.test('CacheManager - TTL expiration', async () => {
    const cache = new CacheManager<string>({ maxSize: 10, defaultTTL: 100 });
    cache.set('key1', 'value1');

    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = cache.get('key1');
    Assertions.assertTrue(result === undefined, 'Value should be expired');
  });

  runner.test('CacheManager - LRU eviction', () => {
    const cache = new CacheManager<string>({ maxSize: 3, defaultTTL: 5000 });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1

    Assertions.assertTrue(cache.get('key1') === undefined, 'key1 should be evicted');
    Assertions.assertTrue(cache.get('key4') === 'value4', 'key4 should be present');
  });

  runner.test('CacheManager - stats', () => {
    const cache = new CacheManager<string>({ maxSize: 10, defaultTTL: 5000 });

    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key2'); // miss

    const stats = cache.getStats();
    Assertions.assertTrue(stats.size === 1, 'Size should be 1');
  });

  // ElementLocator tests
  runner.test('ElementLocator - parse string', () => {
    const locator = ElementLocator.parse('#button');
    Assertions.assert(
      locator.type === 'css',
      'Should default to css type'
    );
    Assertions.assert(
      locator.value === '#button',
      'Value should match'
    );
  });

  runner.test('ElementLocator - byCSS', () => {
    const locator = ElementLocator.byCSS('.my-class');
    Assertions.assert(
      locator.type === 'css' && locator.value === '.my-class',
      'Locator should be correct'
    );
  });

  runner.test('ElementLocator - byText', () => {
    const locator = ElementLocator.byText('Submit');
    Assertions.assert(
      locator.type === 'text' && locator.value === 'Submit',
      'Locator should be correct'
    );
  });

  runner.test('ElementLocator - byXPath', () => {
    const locator = ElementLocator.byXPath('//div[@class="item"]');
    Assertions.assert(
      locator.type === 'xpath' && locator.value === '//div[@class="item"]',
      'Locator should be correct'
    );
  });

  runner.test('ElementLocator - byAriaLabel', () => {
    const locator = ElementLocator.byAriaLabel('Submit button');
    Assertions.assert(
      locator.type === 'aria-label' && locator.value === 'Submit button',
      'Locator should be correct'
    );
  });

  runner.test('ElementLocator - byRole', () => {
    const locator = ElementLocator.byRole('button');
    Assertions.assert(
      locator.type === 'role' && locator.value === 'button',
      'Locator should be correct'
    );
  });

  // Test data generator tests
  runner.test('TestDataGenerator - generatePageContent', () => {
    const content = TestDataGenerator.generatePageContent({
      url: 'https://test.com',
    });

    Assertions.assertPageContent(content, { url: 'https://test.com' });
  });

  runner.test('TestDataGenerator - generateElementInfo', () => {
    const info = TestDataGenerator.generateElementInfo({
      tagName: 'BUTTON',
    });

    Assertions.assertElementInfo(info, { tagName: 'BUTTON' });
  });

  runner.test('TestDataGenerator - generateTabInfo', () => {
    const tab = TestDataGenerator.generateTabInfo({
      url: 'https://example.com',
    });

    Assertions.assertTabInfo(tab, { url: 'https://example.com' });
  });

  // Run all tests
  await runner.run();

  return runner.getResults();
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then((results) => {
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { runTests };
