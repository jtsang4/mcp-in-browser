/**
 * Element Locators - Support multiple ways to locate elements
 */

export type LocatorType =
  | 'css'
  | 'xpath'
  | 'text'
  | 'aria-label'
  | 'role'
  | 'name'
  | 'placeholder';

export interface Locator {
  type: LocatorType;
  value: string;
}

export class ElementLocator {
  /**
   * Find element by CSS selector
   */
  static byCSS(selector: string): Locator {
    return { type: 'css', value: selector };
  }

  /**
   * Find element by XPath
   */
  static byXPath(xpath: string): Locator {
    return { type: 'xpath', value: xpath };
  }

  /**
   * Find element by text content
   */
  static byText(text: string, exact = false): Locator {
    return {
      type: 'text',
      value: exact ? text : text,
    };
  }

  /**
   * Find element by aria-label
   */
  static byAriaLabel(label: string, exact = false): Locator {
    return { type: 'aria-label', value: label };
  }

  /**
   * Find element by ARIA role
   */
  static byRole(role: string): Locator {
    return { type: 'role', value: role };
  }

  /**
   * Find element by name attribute
   */
  static byName(name: string): Locator {
    return { type: 'name', value: name };
  }

  /**
   * Find element by placeholder
   */
  static byPlaceholder(placeholder: string, exact = false): Locator {
    return { type: 'placeholder', value: placeholder };
  }

  /**
   * Parse locator from string or object
   */
  static parse(locator: string | Locator): Locator {
    if (typeof locator === 'string') {
      // Default to CSS selector
      return { type: 'css', value: locator };
    }
    return locator;
  }

  /**
   * Find element(s) using locator
   */
  static find(locator: Locator, all = false): Element[] | null {
    switch (locator.type) {
      case 'css':
        return all
          ? Array.from(document.querySelectorAll(locator.value))
          : document.querySelector(locator.value)
            ? [document.querySelector(locator.value)!]
            : null;

      case 'xpath': {
        const result = document.evaluate(
          locator.value,
          document,
          null,
          all
            ? XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
            : XPathResult.FIRST_ORDERED_NODE_TYPE
        );

        if (all) {
          const elements: Element[] = [];
          for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            if (node instanceof Element) {
              elements.push(node);
            }
          }
          return elements;
        } else {
          const node = result.singleNodeValue;
          return node instanceof Element ? [node] : null;
        }
      }

      case 'text': {
        const exact = locator.value;
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const text = node.textContent?.trim();
              return text === exact ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            },
          }
        );

        if (all) {
          const elements: Element[] = [];
          let node;
          while ((node = walker.nextNode())) {
            elements.push(node.parentElement!);
          }
          return elements;
        } else {
          const node = walker.nextNode();
          return node?.parentElement ? [node.parentElement] : null;
        }
      }

      case 'aria-label': {
        const selector = `[aria-label="${locator.value}"]`;
        return all
          ? Array.from(document.querySelectorAll(selector))
          : document.querySelector(selector)
            ? [document.querySelector(selector)!]
            : null;
      }

      case 'role': {
        const selector = `[role="${locator.value}"]`;
        return all
          ? Array.from(document.querySelectorAll(selector))
          : document.querySelector(selector)
            ? [document.querySelector(selector)!]
            : null;
      }

      case 'name': {
        const selector = `[name="${locator.value}"]`;
        return all
          ? Array.from(document.querySelectorAll(selector))
          : document.querySelector(selector)
            ? [document.querySelector(selector)!]
            : null;
      }

      case 'placeholder': {
        const selector = `[placeholder="${locator.value}"]`;
        return all
          ? Array.from(document.querySelectorAll(selector))
          : document.querySelector(selector)
            ? [document.querySelector(selector)!]
            : null;
      }

      default:
        return null;
    }
  }
}
