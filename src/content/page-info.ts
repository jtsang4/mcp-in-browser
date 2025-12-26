/**
 * Page Information Utilities
 */

export interface PageContent {
  url: string;
  title: string;
  html?: string;
  text?: string;
  selectedContent?: string;
  timestamp: number;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent: string;
  attributes: Record<string, string>;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  visible: boolean;
}

export class PageInfo {
  /**
   * Get text content from an element
   */
  static getText(element: Element, maxLength = 1000): string {
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
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent || '';
      } else if (child instanceof Element) {
        const style = window.getComputedStyle(child);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          text += this.getText(child, maxLength - text.length);
        }
        if (text.length >= maxLength) break;
      }
    }

    return text.trim().substring(0, maxLength);
  }

  /**
   * Get detailed information about an element
   */
  static getElementInfo(element: Element): ElementInfo {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    // Get attributes
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    return {
      tagName: element.tagName,
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: this.getText(element, 500),
      attributes,
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
      },
      visible:
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0,
    };
  }

  /**
   * Get full page content
   */
  static getPageContent(selector?: string): PageContent {
    const base: PageContent = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
    };

    if (selector) {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Element "${selector}" not found`);
      }
      base.selectedContent = this.getText(element);
      base.html = element.outerHTML;
    } else {
      base.text = document.body?.innerText || '';
      base.html = document.body?.innerHTML || '';
    }

    return base;
  }

  /**
   * Get form values
   */
  static getFormValues(selector?: string): Record<string, unknown> {
    const form = selector
      ? document.querySelector(selector) as HTMLFormElement
      : document.querySelector('form') as HTMLFormElement;

    if (!form) {
      throw new Error('No form found');
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

    return values;
  }

  /**
   * Get visible text on page
   */
  static getVisibleText(): string {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const style = window.getComputedStyle(parent);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          const text = node.textContent?.trim();
          return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );

    const texts: string[] = [];
    let node;
    while ((node = walker.nextNode())) {
      texts.push(node.textContent?.trim() || '');
    }

    return texts.join('\n');
  }

  /**
   * Get all links on page
   */
  static getLinks(): Array<{ href: string; text: string; title?: string }> {
    const links: Array<{ href: string; text: string; title?: string }> = [];

    document.querySelectorAll('a[href]').forEach((link) => {
      links.push({
        href: (link as HTMLAnchorElement).href,
        text: link.textContent?.trim() || '',
        title: link.getAttribute('title') || undefined,
      });
    });

    return links;
  }

  /**
   * Get all images on page
   */
  static getImages(): Array<{ src: string; alt?: string; width?: number; height?: number }> {
    const images: Array<{ src: string; alt?: string; width?: number; height?: number }> = [];

    document.querySelectorAll('img').forEach((img) => {
      images.push({
        src: (img as HTMLImageElement).src,
        alt: img.getAttribute('alt') || undefined,
        width: (img as HTMLImageElement).naturalWidth,
        height: (img as HTMLImageElement).naturalHeight,
      });
    });

    return images;
  }

  /**
   * Get all headings on page
   */
  static getHeadings(): Array<{ level: number; text: string; id?: string }> {
    const headings: Array<{ level: number; text: string; id?: string }> = [];

    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag) => {
      document.querySelectorAll(tag).forEach((heading) => {
        headings.push({
          level: parseInt(tag.substring(1)),
          text: heading.textContent?.trim() || '',
          id: heading.id || undefined,
        });
      });
    });

    return headings;
  }

  /**
   * Get page structure (main sections)
   */
  static getPageStructure(): Array<{ tag: string; text: string; depth: number }> {
    const structure: Array<{ tag: string; text: string; depth: number }> = [];

    const tags = ['h1', 'h2', 'h3', 'nav', 'main', 'section', 'article', 'aside', 'footer'];

    tags.forEach((tag) => {
      document.querySelectorAll(tag).forEach((element) => {
        structure.push({
          tag,
          text: element.textContent?.trim().substring(0, 100) || '',
          depth: element.parentElement ? this.getDepth(element) : 0,
        });
      });
    });

    return structure;
  }

  private static getDepth(element: Element): number {
    let depth = 0;
    let current = element;
    while (current.parentElement && depth < 20) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }
}
