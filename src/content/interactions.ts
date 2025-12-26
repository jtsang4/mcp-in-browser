/**
 * Advanced Element Interactions
 */

import { WaitFor } from './wait-for';
import { ElementLocator, type Locator } from './locators';

export interface ClickOptions {
  scrollIntoView?: boolean;
  waitForClickable?: boolean;
  delay?: number;
  button?: 'left' | 'middle' | 'right';
  modifiers?: {
    alt?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
}

export interface FillOptions {
  clear?: boolean;
  dispatchEvents?: boolean;
  delay?: number;
}

export interface TypeOptions {
  delay?: number;
  clear?: boolean;
}

export interface HoverOptions {
  scrollIntoView?: boolean;
  delay?: number;
}

export class Interactions {
  /**
   * Click an element
   */
  static async click(
    selector: string | Locator,
    options: ClickOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const {
      scrollIntoView = true,
      waitForClickable = true,
      delay = 100,
      button = 'left',
      modifiers = {},
    } = options;

    try {
      const locator = ElementLocator.parse(selector);
      const locatorValue = typeof locator === 'string' ? locator : locator.value;

      let element: Element;
      if (waitForClickable) {
        const result = await WaitFor.clickable(locatorValue);
        element = Array.isArray(result) ? result[0] : result;
      } else {
        const result = await WaitFor.element(locatorValue);
        element = Array.isArray(result) ? result[0] : result;
      }

      if (scrollIntoView) {
        (element as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Check clickability
      const style = window.getComputedStyle(element);
      if (style.pointerEvents === 'none') {
        return { success: false, error: 'Element is not clickable (pointer-events: none)' };
      }

      // Build modifier flags
      const eventInit: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        button: button === 'left' ? 0 : button === 'middle' ? 1 : 2,
        buttons: 1,
        altKey: modifiers.alt || false,
        ctrlKey: modifiers.ctrl || false,
        metaKey: modifiers.meta || false,
        shiftKey: modifiers.shift || false,
      };

      const rect = element.getBoundingClientRect();
      eventInit.clientX = rect.left + rect.width / 2;
      eventInit.clientY = rect.top + rect.height / 2;

      // Dispatch mouse events
      element.dispatchEvent(new MouseEvent('mousedown', eventInit));
      await new Promise((resolve) => setTimeout(resolve, delay));

      element.dispatchEvent(new MouseEvent('mouseup', eventInit));
      await new Promise((resolve) => setTimeout(resolve, delay));

      element.dispatchEvent(new MouseEvent('click', eventInit));

      // Native click as fallback
      if (element instanceof HTMLElement) {
        element.click();
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Click at specific coordinates
   */
  static async clickAt(
    x: number,
    y: number,
    options: { delay?: number; double?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    const { delay = 100, double = false } = options;

    try {
      const element = document.elementFromPoint(x, y);

      if (!element) {
        return { success: false, error: `No element found at coordinates (${x}, ${y})` };
      }

      const rect = element.getBoundingClientRect();
      const eventInit: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        screenX: x + window.screenX,
        screenY: y + window.screenY,
        button: 0,
        buttons: 1,
      };

      // Dispatch events
      element.dispatchEvent(new MouseEvent('mousedown', eventInit));
      await new Promise((resolve) => setTimeout(resolve, delay));

      element.dispatchEvent(new MouseEvent('mouseup', eventInit));
      await new Promise((resolve) => setTimeout(resolve, delay));

      element.dispatchEvent(new MouseEvent('click', eventInit));

      if (double) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        element.dispatchEvent(new MouseEvent('dblclick', eventInit));
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Fill an input field
   */
  static async fill(
    selector: string | Locator,
    value: string,
    options: FillOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const {
      clear = true,
      dispatchEvents = true,
      delay = 50,
    } = options;

    try {
      const locator = ElementLocator.parse(selector);
      const locatorValue = typeof locator === 'string' ? locator : locator.value;
      const waitResult = await WaitFor.visible(locatorValue);
      const element = Array.isArray(waitResult) ? waitResult[0] : waitResult;

      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        )
      ) {
        return { success: false, error: 'Element is not an input, textarea, or select' };
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((resolve) => setTimeout(resolve, 300));
      element.focus();

      if (dispatchEvents) {
        element.dispatchEvent(new Event('focus', { bubbles: true }));
      }

      // Clear if requested
      if (clear && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        element.value = '';

        if (dispatchEvents) {
          element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '' }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Set value
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;

        if (dispatchEvents) {
          element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (element instanceof HTMLSelectElement) {
        element.value = value;

        if (dispatchEvents) {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delay));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Type text character by character
   */
  static async type(
    selector: string | Locator,
    text: string,
    options: TypeOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const { delay = 50, clear = true } = options;

    try {
      const waitResult = await WaitFor.visible(
        typeof selector === 'string' ? selector : selector.value
      );
      const element = Array.isArray(waitResult) ? waitResult[0] : waitResult;

      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        )
      ) {
        return { success: false, error: 'Element is not an input or textarea' };
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((resolve) => setTimeout(resolve, 300));
      element.focus();

      if (clear) {
        element.value = '';
      }

      // Type each character
      for (const char of text) {
        element.value += char;
        element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char }));
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Press a key
   */
  static async pressKey(
    key: string,
    options: {
      ctrl?: boolean;
      alt?: boolean;
      shift?: boolean;
      meta?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { ctrl = false, alt = false, shift = false, meta = false } = options;

      const eventInit: KeyboardEventInit = {
        key,
        code: key,
        bubbles: true,
        cancelable: true,
        ctrlKey: ctrl,
        altKey: alt,
        shiftKey: shift,
        metaKey: meta,
      };

      // Dispatch keydown and keyup
      document.dispatchEvent(new KeyboardEvent('keydown', eventInit));
      document.dispatchEvent(new KeyboardEvent('keyup', eventInit));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Hover over an element
   */
  static async hover(
    selector: string | Locator,
    options: HoverOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const { scrollIntoView = true, delay = 100 } = options;

    try {
      const locator = ElementLocator.parse(selector);
      const locatorValue = typeof locator === 'string' ? locator : locator.value;
      const waitResult = await WaitFor.visible(locatorValue);
      const element = Array.isArray(waitResult) ? waitResult[0] : waitResult;

      if (scrollIntoView) {
        (element as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const rect = element.getBoundingClientRect();
      const eventInit: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };

      element.dispatchEvent(new MouseEvent('mouseenter', eventInit));
      await new Promise((resolve) => setTimeout(resolve, delay));
      element.dispatchEvent(new MouseEvent('mouseover', eventInit));
      await new Promise((resolve) => setTimeout(resolve, delay));
      element.dispatchEvent(new MouseEvent('mousemove', eventInit));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Select an option from a select element
   */
  static async selectOption(
    selector: string | Locator,
    value: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const locator = ElementLocator.parse(selector);
      const locatorValue = typeof locator === 'string' ? locator : locator.value;
      const waitResult = await WaitFor.visible(locatorValue);
      const element = Array.isArray(waitResult) ? waitResult[0] : waitResult;

      if (!(element instanceof HTMLSelectElement)) {
        return { success: false, error: 'Element is not a select' };
      }

      const option = Array.from(element.options).find((opt) => opt.value === value);
      if (!option) {
        return { success: false, error: `Option with value "${value}" not found` };
      }

      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get element text content
   */
  static async getText(
    selector: string | Locator
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const locator = ElementLocator.parse(selector);
      const locatorValue = typeof locator === 'string' ? locator : locator.value;
      const waitResult = await WaitFor.element(locatorValue);
      const element = Array.isArray(waitResult) ? waitResult[0] : waitResult;

      return { success: true, text: element.textContent?.trim() || '' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get element attribute
   */
  static async getAttribute(
    selector: string | Locator,
    attribute: string
  ): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
      const locator = ElementLocator.parse(selector);
      const locatorValue = typeof locator === 'string' ? locator : locator.value;
      const waitResult = await WaitFor.element(locatorValue);
      const element = Array.isArray(waitResult) ? waitResult[0] : waitResult;

      return {
        success: true,
        value: (element as HTMLElement).getAttribute(attribute) ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
