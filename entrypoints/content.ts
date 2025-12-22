/**
 * Content Script for Claude in Chrome
 *
 * This script handles page-level automation including clicking, filling forms,
 * getting page content, and querying elements.
 */

interface ContentMessage {
  type: string;
  id: string;
  selector?: string;
  value?: string;
  x?: number;
  y?: number;
  format?: string;
  quality?: number;
}

interface ResponseMessage {
  type: 'response';
  id: string;
  data: unknown;
  error?: string;
}

/**
 * Send a response message back to the background script
 */
function sendResponseMessage(id: string, data: unknown, error?: string): void {
  const response: ResponseMessage = {
    type: 'response',
    id,
    data,
    error,
  };
  chrome.runtime.sendMessage(response);
}

/**
 * Wait for an element to appear in the DOM
 */
function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Get a text representation of an element
 */
function getElementText(element: Element): string {
  // Skip script and style tags
  if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
    return '';
  }

  // For input elements, return the value
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value || element.placeholder || '';
  }

  // For select elements, return the selected option
  if (element instanceof HTMLSelectElement) {
    const selectedOption = element.selectedOptions[0];
    return selectedOption?.text || '';
  }

  // Get text content, but exclude hidden elements
  let text = '';
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child instanceof Element) {
      const style = window.getComputedStyle(child);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        text += getElementText(child);
      }
    }
  }

  return text.trim();
}

/**
 * Get detailed information about an element
 */
function getElementInfo(element: Element): Record<string, unknown> {
  const info: Record<string, unknown> = {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    textContent: getElementText(element).substring(0, 500),
  };

  // Get attributes
  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }
  info.attributes = attributes;

  // Get bounds
  const rect = element.getBoundingClientRect();
  info.bounds = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
  };

  // Get visibility info
  const style = window.getComputedStyle(element);
  info.visible = style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0';

  return info;
}

/**
 * Click an element
 */
async function handleClick(selector: string): Promise<{ success: boolean; error?: string }> {
  try {
    const element = await waitForElement(selector);

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait a bit for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if element is clickable
    const style = window.getComputedStyle(element);
    const isClickable = style.pointerEvents !== 'none' &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';

    if (!isClickable) {
      return { success: false, error: 'Element is not clickable' };
    }

    // Dispatch click events
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // Also try the native click as fallback
    if (element instanceof HTMLElement) {
      element.click();
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Click at a specific coordinate on the page
 */
async function handleClickAt(x: number, y: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the element at the specified coordinates
    const element = document.elementFromPoint(x, y);

    if (!element) {
      return { success: false, error: `No element found at coordinates (${x}, ${y})` };
    }

    // Dispatch click events at the element's position
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + x;
    const clientY = rect.top + y;

    // Create detailed mouse events with coordinates
    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      button: 0,
      buttons: 1,
    });

    const mouseUpEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      button: 0,
      buttons: 0,
    });

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      button: 0,
      buttons: 0,
    });

    element.dispatchEvent(mouseDownEvent);
    await new Promise(resolve => setTimeout(resolve, 50));
    element.dispatchEvent(mouseUpEvent);
    await new Promise(resolve => setTimeout(resolve, 50));
    element.dispatchEvent(clickEvent);

    // Also try the native click as fallback
    if (element instanceof HTMLElement) {
      element.click();
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fill an input field
 */
async function handleFill(selector: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    const element = await waitForElement(selector);

    if (!(element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement)) {
      return { success: false, error: 'Element is not an input, textarea, or select' };
    }

    // Focus the element
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 300));
    element.focus();

    // Clear existing value
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = '';

      // Trigger input events
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      // Set the value
      element.value = value;
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element instanceof HTMLSelectElement) {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get page content
 */
async function handleGetPageContent(selector?: string): Promise<{
  success: boolean;
  content?: {
    url: string;
    title: string;
    text?: string;
    html?: string;
    selectedContent?: string;
  };
  error?: string;
}> {
  try {
    const result: {
      url: string;
      title: string;
      text?: string;
      html?: string;
      selectedContent?: string;
    } = {
      url: window.location.href,
      title: document.title,
    };

    if (selector) {
      const element = await waitForElement(selector);
      result.selectedContent = getElementText(element);
      result.html = element.outerHTML;
    } else {
      result.text = document.body?.innerText || '';
      result.html = document.body?.innerHTML || '';
    }

    return { success: true, content: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Query a single element
 */
async function handleQuerySelector(selector: string): Promise<{
  success: boolean;
  element?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const element = await waitForElement(selector);
    return { success: true, element: getElementInfo(element) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Query all matching elements
 */
async function handleQuerySelectorAll(selector: string): Promise<{
  success: boolean;
  elements?: string[];
  error?: string;
}> {
  try {
    const elements = document.querySelectorAll(selector);
    const result: string[] = [];

    elements.forEach((element, index) => {
      const info = getElementInfo(element);
      info.index = index;
      result.push(JSON.stringify(info));
    });

    return { success: true, elements: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get form values
 */
async function handleGetFormValues(selector?: string): Promise<{
  success: boolean;
  values?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const form = selector
      ? await waitForElement(selector) as HTMLFormElement
      : document.querySelector('form') as HTMLFormElement;

    if (!form) {
      return { success: false, error: 'No form found' };
    }

    const formData = new FormData(form);
    const values: Record<string, unknown> = {};

    formData.forEach((value, key) => {
      if (values[key]) {
        if (Array.isArray(values[key])) {
          (values[key] as unknown[]).push(value);
        } else {
          values[key] = [values[key], value];
        }
      } else {
        values[key] = value;
      }
    });

    return { success: true, values };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Handle incoming messages from background script
 */
chrome.runtime.onMessage.addListener((message: ContentMessage, sender, _sendResponse) => {
  (async () => {
    const { type, id } = message;

    switch (type) {
      case 'click':
        if (message.selector) {
          const result = await handleClick(message.selector);
          sendResponseMessage(id, result);
        }
        break;

      case 'click_at':
        if (message.x !== undefined && message.y !== undefined) {
          const result = await handleClickAt(message.x, message.y);
          sendResponseMessage(id, result);
        }
        break;

      case 'fill':
        if (message.selector && message.value !== undefined) {
          const result = await handleFill(message.selector, message.value);
          sendResponseMessage(id, result);
        }
        break;

      case 'get_page_content':
        const contentResult = await handleGetPageContent(message.selector);
        sendResponseMessage(id, contentResult);
        break;

      case 'query_selector':
        if (message.selector) {
          const queryResult = await handleQuerySelector(message.selector);
          sendResponseMessage(id, queryResult);
        }
        break;

      case 'query_selector_all':
        if (message.selector) {
          const queryAllResult = await handleQuerySelectorAll(message.selector);
          sendResponseMessage(id, queryAllResult);
        }
        break;

      case 'get_form_values':
        const formResult = await handleGetFormValues(message.selector);
        sendResponseMessage(id, formResult);
        break;

      case 'ping':
        sendResponseMessage(id, { pong: true });
        break;

      default:
        sendResponseMessage(id, { error: `Unknown message type: ${type}` });
    }
  })();

  // Return true to indicate async response
  return true;
});

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Claude in Chrome content script loaded on:', window.location.href);
  },
});
