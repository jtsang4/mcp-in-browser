/**
 * Advanced Wait Strategies
 */

export interface WaitForOptions {
  timeout?: number;
  pollInterval?: number;
  message?: string;
}

export type WaitCondition<T = Element> =
  | ((() => boolean) | (() => T | null) | (() => T[]));

export class WaitFor {
  /**
   * Wait for a condition to become true
   */
  static async condition<T>(
    condition: WaitCondition<T>,
    options: WaitForOptions = {}
  ): Promise<T> {
    const { timeout = 10000, pollInterval = 100, message } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = condition();

      if (result === true) {
        return true as T;
      }

      if (result !== false && result !== null && result !== undefined) {
        return result as T;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(message || `Wait condition not met within ${timeout}ms`);
  }

  /**
   * Wait for an element to appear in the DOM
   */
  static async element(
    selector: string,
    options: WaitForOptions & { all?: boolean } = {}
  ): Promise<Element | Element[]> {
    const { all = false, ...waitOptions } = options;

    return this.condition(
      () => {
        const elements = document.querySelectorAll(selector);
        return all ? Array.from(elements) : elements[0];
      },
      {
        ...waitOptions,
        message: all
          ? `Elements matching "${selector}" not found`
          : `Element "${selector}" not found`,
      }
    );
  }

  /**
   * Wait for element to be visible
   */
  static async visible(
    selector: string,
    options: WaitForOptions & { all?: boolean } = {}
  ): Promise<Element | Element[]> {
    const { all = false, ...waitOptions } = options;

    const elements = await this.element(selector, { all, ...waitOptions });

    const checkVisible = (el: Element) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      );
    };

    if (all) {
      const visibleElements = (elements as Element[]).filter(checkVisible);
      if (visibleElements.length === 0) {
        throw new Error(`No visible elements matching "${selector}" found`);
      }
      return visibleElements;
    } else {
      if (!checkVisible(elements as Element)) {
        throw new Error(`Element "${selector}" is not visible`);
      }
      return elements;
    }
  }

  /**
   * Wait for element to be clickable (visible and not obstructed)
   */
  static async clickable(
    selector: string,
    options: WaitForOptions = {}
  ): Promise<Element> {
    const element = await this.visible(selector, options);

    const style = window.getComputedStyle(element);
    if (style.pointerEvents === 'none') {
      throw new Error(`Element "${selector}" has pointer-events: none`);
    }

    return element;
  }

  /**
   * Wait for page load to complete
   */
  static async pageLoad(options: WaitForOptions = {}): Promise<Document> {
    const { timeout = 30000 } = options;

    if (document.readyState === 'complete') {
      return document;
    }

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        window.removeEventListener('load', onLoad);
        reject(new Error(`Page load timeout after ${timeout}ms`));
      }, timeout);

      const onLoad = () => {
        clearTimeout(timeoutHandle);
        resolve(document);
      };

      window.addEventListener('load', onLoad);
    });
  }

  /**
   * Wait for network to be idle
   */
  static async networkIdle(
    options: WaitForOptions & { idleTime?: number } = {}
  ): Promise<void> {
    const { timeout = 30000, idleTime = 500 } = options;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let lastActivity = Date.now();

      const checkIdle = () => {
        if (Date.now() - lastActivity >= idleTime) {
          resolve();
          return;
        }

        if (Date.now() - startTime >= timeout) {
          reject(new Error(`Network idle timeout after ${timeout}ms`));
          return;
        }

        setTimeout(checkIdle, 100);
      };

      // Intercept fetch and XMLHttpRequest to track activity
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        lastActivity = Date.now();
        return originalFetch.apply(window, args);
      };

      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (...args) {
        lastActivity = Date.now();
        return originalOpen.apply(this, args);
      };

      checkIdle();

      // Cleanup after timeout or resolution
      setTimeout(() => {
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalOpen;
      }, timeout + 1000);
    });
  }

  /**
   * Wait for URL to change
   */
  static async urlChange(
    options: WaitForOptions & { currentUrl?: string } = {}
  ): Promise<string> {
    const { currentUrl = window.location.href, ...waitOptions } = options;

    return this.condition(
      () => {
        if (window.location.href !== currentUrl) {
          return window.location.href;
        }
        return null;
      },
      {
        ...waitOptions,
        message: 'URL did not change within timeout',
      }
    );
  }

  /**
   * Wait for element text to contain value
   */
  static async textContent(
    selector: string,
    text: string,
    options: WaitForOptions & { exact?: boolean } = {}
  ): Promise<Element> {
    const { exact = false, ...waitOptions } = options;

    return this.condition(
      () => {
        const element = document.querySelector(selector);
        if (!element) return null;

        const content = element.textContent?.trim() || '';
        if (exact) {
          return content === text ? element : null;
        } else {
          return content.includes(text) ? element : null;
        }
      },
      {
        ...waitOptions,
        message: `Element "${selector}" text did not match`,
      }
    );
  }

  /**
   * Wait for element attribute to contain value
   */
  static async attribute(
    selector: string,
    attribute: string,
    value: string,
    options: WaitForOptions = {}
  ): Promise<Element> {
    return this.condition(
      () => {
        const element = document.querySelector(selector) as HTMLElement;
        if (!element) return null;

        const attrValue = element.getAttribute(attribute);
        return attrValue?.includes(value) ? element : null;
      },
      {
        ...waitOptions,
        message: `Element "${selector}" attribute "${attribute}" did not contain "${value}"`,
      }
    );
  }

  /**
   * Wait for custom condition
   */
  static async custom<T>(
    condition: () => T | null | false,
    options: WaitForOptions = {}
  ): Promise<T> {
    return this.condition(condition, options);
  }
}
