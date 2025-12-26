/**
 * Content Script - WXT Entry Point
 *
 * Uses unified messaging from entrypoints/messaging/
 */

import { defineContentScript } from 'wxt/utils/define-content-script';
import { logger } from '../src/core/logger';

// Import and register content script handlers
import './messaging/content-handlers';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    logger.info('ContentScript', 'MCP in Browser loaded', {
      url: window.location.href,
    });

    // Handlers are automatically registered by importing content-handlers.ts
    // No need for manual message listener setup
  },
});
