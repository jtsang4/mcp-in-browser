# WXT Integration Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the MCP in Browser extension to properly leverage WXT framework features, eliminate code duplication, and improve maintainability.

**Architecture:**
- Use `@webext-core/messaging` for type-safe message passing between contexts
- Share `BridgeClient` between MCP server and extension to eliminate duplicate WebSocket logic
- Use `@webext-core/storage` for type-safe configuration management
- Organize types into separate files without barrel exports
- Remove unused UI components (popup/sidepanel) and dead code

**Tech Stack:**
- WXT (Web Extension Tools)
- @webext-core/messaging
- @webext-core/storage
- TypeScript

---

## Phase 1: Remove Unused Code (Simple Cleanup)

### Task 1.1: Remove unused MessageQueue class

**Files:**
- Delete: `src/messaging/message-queue.ts`
- Modify: `src/messaging/` (remove directory if empty after)

**Step 1: Verify MessageQueue is not imported anywhere**

Run: `grep -r "MessageQueue" --include="*.ts" --include="*.vue" .`
Expected: Only results in `src/messaging/message-queue.ts` itself

**Step 2: Delete the file**

Run: `rm src/messaging/message-queue.ts`

**Step 3: Check if messaging directory is now empty**

Run: `ls -la src/messaging/`

If directory only contains the deleted file or is empty:
```bash
rmdir src/messaging/
```

**Step 4: Verify build still works**

Run: `pnpm run compile`
Expected: No type errors

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove unused MessageQueue class"
```

---

### Task 1.2: Remove default WXT template files

**Files:**
- Delete: `components/HelloWorld.vue`
- Delete: `components/` directory
- Delete: `assets/` directory

**Step 1: Verify components are not used**

Run: `grep -r "HelloWorld" --include="*.ts" --include="*.vue" entrypoints/`
Expected: Only in `entrypoints/popup/App.vue` (will be removed later)

**Step 2: Delete components directory**

Run: `rm -rf components/`

**Step 3: Delete assets directory**

Run: `rm -rf assets/`

**Step 4: Update tsconfig.json to remove assets reference (if present)**

Check if `tsconfig.json` has references to assets:
```bash
grep "assets" tsconfig.json
```

If found, remove those lines from tsconfig.json.

**Step 5: Verify build**

Run: `pnpm run compile`
Expected: No errors

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove default WXT template files"
```

---

### Task 1.3: Remove popup and sidepanel entry points

**Files:**
- Delete: `entrypoints/popup/`
- Delete: `entrypoints/sidepanel/`
- Modify: `wxt.config.ts`

**Step 1: Update wxt.config.ts to remove side_panel configuration**

Edit `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'MCP in Browser',
    description: 'Browser automation extension that works with Claude Code via MCP',
    permissions: [
      'tabs',
      'activeTab',
      'storage',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
  },
  webExt: {
    disabled: false,
  },
});
```

Changes made:
- Removed `'sidePanel'` from permissions array
- Removed entire `side_panel` configuration block

**Step 2: Delete popup directory**

Run: `rm -rf entrypoints/popup/`

**Step 3: Delete sidepanel directory**

Run: `rm -rf entrypoints/sidepanel/`

**Step 4: Verify build**

Run: `pnpm run dev`
Expected: Extension builds without errors, no popup/sidepanel in manifest

**Step 5: Test extension loads**

Run: `pnpm run build` and load the extension in Chrome to verify it loads correctly.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove popup and sidepanel entry points"
```

---

## Phase 2: Reorganize Type Definitions

### Task 2.1: Create new type files structure

**Files:**
- Create: `types/bridge.ts`
- Create: `types/messaging.ts`
- Create: `types/tools.ts`
- Create: `types/config.ts`
- Modify: `types/index.ts`

**Step 1: Create types/bridge.ts**

Create file with BridgeMessage and related types:

```typescript
import type { JsonValue } from './index';

export interface BridgeMessage {
  type: 'hello' | 'tool_call' | 'response' | 'error';
  id?: string;
  tool?: string;
  params?: Record<string, JsonValue>;
  data?: JsonValue | null;
  error?: string;
  client?: 'extension' | 'mcp-server';
  status?: string;
}

export type BridgeClientType = 'extension' | 'mcp-server';

export interface BridgeClientConfig {
  url: string;
  port: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageQueueLimit: number;
}
```

**Step 2: Create types/messaging.ts**

Create file with content script messaging types:

```typescript
import type { JsonValue } from './index';

export interface ContentMessage {
  type: string;
  id: string;
  selector?: string;
  value?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  attribute?: string;
  options?: Record<string, JsonValue>;
}

export type ContentHandlerResult =
  | { success: boolean; error?: string }
  | { success: true; content: PageContent }
  | { success: true; element: ElementInfo }
  | { success: true; elements: ElementInfo[] }
  | { success: true; values: Record<string, FormDataEntryValue | FormDataEntryValue[]> }
  | { success: true; text: string }
  | { success: true; attribute: string | null }
  | { pong: true };

export interface ResponseMessage {
  type: 'response';
  id: string;
  data: ContentHandlerResult | null;
  error?: string;
}

// These types need to be defined or imported
// For now, use placeholders - will be refined in later tasks
export interface PageContent {
  title: string;
  url: string;
  text?: string;
  html?: string;
}

export interface ElementInfo {
  tagName: string;
  text?: string;
  attributes?: Record<string, string>;
  visible?: boolean;
}
```

**Step 3: Create types/tools.ts**

Create file with tool-related types:

```typescript
import type { JsonValue } from './index';

export interface ToolHandler<T = JsonValue> {
  (params: Record<string, JsonValue>): Promise<T>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
}

export interface ToolResult {
  success: boolean;
  error?: string;
}
```

**Step 4: Create types/config.ts**

Create file with configuration types:

```typescript
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableHistory: boolean;
  maxHistorySize: number;
}

export interface BridgeConfig {
  url: string;
  port: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageQueueLimit: number;
}

export interface AppConfig {
  logging: LoggingConfig;
  concurrency: number;
  bridge: BridgeConfig;
}

export function getDefaultConfig(): AppConfig {
  return {
    logging: {
      level: 'info',
      enableHistory: true,
      maxHistorySize: 1000,
    },
    concurrency: 5,
    bridge: {
      url: 'ws://localhost:37373',
      port: 37373,
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      messageQueueLimit: 100,
    },
  };
}
```

**Step 5: Update types/index.ts**

Edit file to only contain core types:

```typescript
// Core JSON-compatible value type
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Basic JSON Schema type
export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number)[];
  description?: string;
  [key: string]: unknown;
};
```

**Step 6: Verify build**

Run: `pnpm run compile`
Expected: No type errors

**Step 7: Commit**

```bash
git add types/
git commit -m "refactor: reorganize type definitions into separate files"
```

---

### Task 2.2: Update imports to use specific type files

**Files:**
- Modify: `src/bridge/client.ts`
- Modify: `src/background/index.ts`
- Modify: `src/background/tools.ts`
- Modify: `entrypoints/content.ts`
- Modify: `mcp-server/index.ts`
- Modify: `src/core/config.ts`

**Step 1: Update src/bridge/client.ts imports**

Edit imports at top of file:

Change from:
```typescript
import type { AppConfig } from '../core/config';
import type { JsonValue } from '../../types';
```

To:
```typescript
import type { BridgeClientConfig, BridgeMessage, BridgeClientType } from '../../../types/bridge';
import type { JsonValue } from '../../../types/index';
```

Update the class to use new types:

Change constructor signature:
```typescript
  constructor(
    private clientType: BridgeClientType,
    config?: BridgeClientConfig
  ) {
```

Update config property:
```typescript
  private config: BridgeClientConfig = {
    url: 'ws://localhost:37373',
    port: 37373,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    messageQueueLimit: 100,
  };
```

Update setConfig method:
```typescript
  setConfig(config: BridgeClientConfig) {
    this.config = config;
  }
```

**Step 2: Update mcp-server/index.ts to use shared types**

Edit imports at top of file:

Remove local type definition (lines 19-20):
```typescript
// Delete these lines:
// JSON-compatible value type
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
```

Add import:
```typescript
import type { BridgeMessage, JsonValue } from '../types/bridge';
```

**Step 3: Update src/core/config.ts to use new config types**

Edit file to export from types/config.ts instead of defining locally:

```typescript
export type { AppConfig, LoggingConfig, BridgeConfig, getDefaultConfig } from '../../../types/config';
```

Or move the implementation to types/config.ts if not already done.

**Step 4: Verify build**

Run: `pnpm run compile`
Expected: No type errors

**Step 5: Test extension**

Run: `pnpm run dev` and verify extension loads correctly.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: update imports to use specific type files"
```

---

## Phase 3: Unified Messaging with @webext-core/messaging

### Task 3.1: Define unified messaging protocol

**Files:**
- Create: `entrypoints/messaging/protocol.ts`
- Create: `entrypoints/messaging/content-handlers.ts`
- Create: `entrypoints/messaging/background-handlers.ts`

**Step 1: Create entrypoints/messaging/protocol.ts**

Create new directory and file:

Run: `mkdir -p entrypoints/messaging`

Create file:

```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { JsonValue } from '../../types/index';
import type { PageContent, ElementInfo } from '../../types/messaging';

// Unified protocol for extension-internal messaging
interface ExtensionProtocolMap {
  // Navigation
  navigate: (input: { url: string; tabId?: number }) => Promise<{ success: boolean }>;
  reload: (input: { tabId?: number }) => Promise<{ success: boolean }>;

  // Tab management
  list_tabs: (input: { activeOnly?: boolean }) => Promise<Array<{ id: number; url: string; title: string; active: boolean }>>;
  activate_tab: (input: { tabId: number }) => Promise<{ success: boolean }>;
  get_current_tab: () => Promise<{ id: number; url?: string; title?: string } | null>;

  // Page content
  get_page_content: (input: { selector?: string; tabId?: number }) => Promise<{ success: boolean; content?: PageContent; error?: string }>;
  screenshot: (input: { tabId?: number; format?: 'png' | 'jpeg'; quality?: number }) => Promise<{ success: boolean; screenshot?: { dataUrl: string; width: number; height: number } }>;

  // Element interactions
  click: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  click_at: (input: { x: number; y: number; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  fill: (input: { selector: string; value: string; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  type: (input: { selector: string; text: string; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  press_key: (input: { key: string; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  hover: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  select_option: (input: { selector: string; value: string }) => Promise<{ success: boolean; error?: string }>;

  // Element queries
  query_selector: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; element?: ElementInfo; error?: string }>;
  query_selector_all: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; elements?: ElementInfo[]; error?: string }>;

  // Element data
  get_text: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; text?: string; error?: string }>;
  get_attribute: (input: { selector: string; attribute: string; tabId?: number }) => Promise<{ success: boolean; attribute?: string | null; error?: string }>;

  // Form helpers
  get_form_values: (input: { selector?: string; tabId?: number }) => Promise<{ success: boolean; values?: Record<string, FormDataEntryValue | FormDataEntryValue[]>; error?: string }>;

  // Waiting
  wait_for: (input: { selector: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  wait_for_visible: (input: { selector: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;
  wait_for_text: (input: { selector: string; text: string; tabId?: number; options?: Record<string, JsonValue> }) => Promise<{ success: boolean; error?: string }>;

  // Health check
  ping: () => Promise<{ pong: boolean }>;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ExtensionProtocolMap>();

export type ExtensionProtocolMapType = ExtensionProtocolMap;
```

**Step 2: Create entrypoints/messaging/content-handlers.ts**

Create file for content script message handlers:

```typescript
import { onMessage } from './protocol';
import { Interactions } from '../../src/content/interactions';
import { WaitFor } from '../../src/content/wait-for';
import { PageInfo } from '../../src/content/page-info';
import { logger } from '../../src/core/logger';

// Register all content script handlers

// Navigation handlers are handled by background script

// Interaction handlers
onMessage('click', async ({ data }) => {
  return await Interactions.click(data.selector, data.options || {});
});

onMessage('click_at', async ({ data }) => {
  return await Interactions.clickAt(data.x, data.y, data.options || {});
});

onMessage('fill', async ({ data }) => {
  return await Interactions.fill(data.selector, data.value, data.options || {});
});

onMessage('type', async ({ data }) => {
  return await Interactions.type(data.selector, data.text, data.options || {});
});

onMessage('press_key', async ({ data }) => {
  return await Interactions.pressKey(data.key, data.options || {});
});

onMessage('hover', async ({ data }) => {
  return await Interactions.hover(data.selector, data.options || {});
});

onMessage('select_option', async ({ data }) => {
  return await Interactions.selectOption(data.selector, data.value);
});

// Content handlers
onMessage('get_page_content', async ({ data }) => {
  const content = data.selector ? PageInfo.getPageContent(data.selector) : PageInfo.getPageContent();
  return { success: true, content };
});

onMessage('query_selector', async ({ data }) => {
  const result = await WaitFor.element(data.selector);
  const element = Array.isArray(result) ? result[0] : result;
  return { success: true, element: PageInfo.getElementInfo(element) };
});

onMessage('query_selector_all', async ({ data }) => {
  const result = await WaitFor.element(data.selector, { all: true });
  const elements = Array.isArray(result) ? result : [result];
  return { success: true, elements: elements.map(el => PageInfo.getElementInfo(el)) };
});

onMessage('get_form_values', async ({ data }) => {
  return { success: true, values: PageInfo.getFormValues(data.selector) };
});

onMessage('get_text', async ({ data }) => {
  return await Interactions.getText(data.selector);
});

onMessage('get_attribute', async ({ data }) => {
  return await Interactions.getAttribute(data.selector, data.attribute);
});

// Waiting handlers
onMessage('wait_for', async ({ data }) => {
  await WaitFor.element(data.selector, data.options);
  return { success: true };
});

onMessage('wait_for_visible', async ({ data }) => {
  await WaitFor.visible(data.selector, data.options);
  return { success: true };
});

onMessage('wait_for_text', async ({ data }) => {
  await WaitFor.textContent(data.selector, data.text, data.options);
  return { success: true };
});

// Health check
onMessage('ping', async () => {
  return { pong: true };
});

logger.info('ContentHandlers', 'All content script handlers registered');
```

**Step 3: Create entrypoints/messaging/background-handlers.ts**

Create file for background script handlers:

```typescript
import { onMessage } from './protocol';
import { browser } from 'wxt/browser';
import { logger } from '../../src/core/logger';

// Register handlers that run in background context

onMessage('navigate', async ({ data }) => {
  try {
    if (data.tabId) {
      await browser.tabs.update(data.tabId, { url: data.url });
      await browser.tabs.update(data.tabId, { active: true });
    } else {
      await browser.tabs.create({ url: data.url });
    }
    return { success: true };
  } catch (error) {
    logger.error('BackgroundHandlers', 'Navigate failed', { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('reload', async ({ data }) => {
  try {
    if (data.tabId) {
      await browser.tabs.reload(data.tabId);
    } else {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.reload(tabs[0].id);
      }
    }
    return { success: true };
  } catch (error) {
    logger.error('BackgroundHandlers', 'Reload failed', { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('list_tabs', async ({ data }) => {
  try {
    const query = data.activeOnly ? { active: true } : {};
    const tabs = await browser.tabs.query(query);
    return tabs.map((tab) => ({
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || '',
      active: tab.active,
    }));
  } catch (error) {
    logger.error('BackgroundHandlers', 'List tabs failed', { error });
    return [];
  }
});

onMessage('activate_tab', async ({ data }) => {
  try {
    await browser.tabs.update(data.tabId, { active: true });
    const tab = await browser.tabs.get(data.tabId);
    if (tab.windowId) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
    return { success: true };
  } catch (error) {
    logger.error('BackgroundHandlers', 'Activate tab failed', { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

onMessage('get_current_tab', async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab) return null;
    return {
      id: tab.id!,
      url: tab.url,
      title: tab.title,
    };
  } catch (error) {
    logger.error('BackgroundHandlers', 'Get current tab failed', { error });
    return null;
  }
});

onMessage('screenshot', async ({ data }) => {
  try {
    let tab;
    if (data.tabId !== undefined) {
      tab = await browser.tabs.get(data.tabId);
    } else {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
    }

    if (!tab?.windowId) {
      return { success: false, error: 'No active tab or window found' };
    }

    const window = await browser.windows.get(tab.windowId);
    const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
      format: data.format || 'png',
      quality: data.quality || 90,
    });

    return {
      success: true,
      screenshot: {
        dataUrl,
        width: window.width || 0,
        height: window.height || 0,
      },
    };
  } catch (error) {
    logger.error('BackgroundHandlers', 'Screenshot failed', { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

logger.info('BackgroundHandlers', 'All background handlers registered');
```

**Step 4: Verify build**

Run: `pnpm run compile`
Expected: No type errors

**Step 5: Commit**

```bash
git add entrypoints/messaging/
git commit -m "feat: define unified messaging protocol with @webext-core/messaging"
```

---

### Task 3.2: Refactor content script to use new messaging

**Files:**
- Modify: `entrypoints/content.ts`

**Step 1: Replace manual message handling with @webext-core/messaging**

Edit `entrypoints/content.ts` to:

```typescript
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
```

**Step 2: Verify build**

Run: `pnpm run compile`
Expected: No errors

**Step 3: Test in browser**

Run: `pnpm run dev` and test that content script loads and responds to messages.

**Step 4: Commit**

```bash
git add entrypoints/content.ts
git commit -m "refactor: content script now uses unified messaging"
```

---

### Task 3.3: Refactor background tools to use new messaging

**Files:**
- Modify: `src/background/tools.ts`
- Modify: `src/background/index.ts`

**Step 1: Update src/background/tools.ts to use sendMessage**

Edit file to remove duplicate `sendToContentScript` and use `sendMessage` from protocol:

```typescript
import { logger } from '../core/logger';
import { AppError, ErrorCode } from '../core/errors';
import { Schemas } from '../core/validator';
import { sendMessage } from '../../entrypoints/messaging/protocol';
import type { ToolHandler, ToolDefinition } from '../../types/tools';
import type { JsonValue } from '../../types/index';

export interface ToolHandler<T = JsonValue> {
  (params: Record<string, JsonValue>): Promise<T>;
}

// ... keep tool handler functions but replace sendToContentScript with sendMessage ...

/**
 * Click an element
 */
export const clickTool: ToolHandler = async (params) => {
  const validated = Schemas.click.parse(params);

  // Use sendMessage from @webext-core/messaging
  return await sendMessage('click', {
    selector: validated.selector,
    tabId: validated.tabId,
  });
};

// Apply similar pattern to all other tools that communicate with content scripts
```

**Step 2: Update src/background/index.ts to register background handlers**

Add import and register background handlers:

```typescript
import './background-handlers';  // Register background message handlers
```

**Step 3: Remove duplicate sendToContentScript from tools.ts**

Delete the function at lines 347-385.

**Step 4: Verify build**

Run: `pnpm run compile`
Expected: No errors

**Step 5: Test functionality**

Run: `pnpm run dev` and verify all tools still work correctly.

**Step 6: Commit**

```bash
git add src/background/
git commit -m "refactor: background tools now use unified messaging"
```

---

## Phase 4: Shared BridgeClient Implementation

### Task 4.1: Create shared bridge module

**Files:**
- Create: `shared/bridge/client.ts`
- Create: `shared/bridge/index.ts`

**Step 1: Create shared directory**

Run: `mkdir -p shared/bridge`

**Step 2: Copy and adapt BridgeClient to shared/bridge/client.ts**

Move `src/bridge/client.ts` content to `shared/bridge/client.ts` with updated imports:

```typescript
/**
 * Shared WebSocket Bridge Client
 * Used by both extension and MCP server
 */

import WebSocket from 'ws';  // Node.js WebSocket
import { logger } from '../src/core/logger';
import { AppError, ErrorCode } from '../src/core/errors';
import { generateId } from '../src/core/id-generator';
import type { BridgeClientConfig, BridgeMessage, BridgeClientType } from '../types/bridge';
import type { JsonValue } from '../types/index';

// ... rest of the BridgeClient class implementation ...

export class BridgeClient {
  // ... same implementation ...
}

export function createBridgeClient(
  clientType: BridgeClientType,
  config?: BridgeClientConfig
): BridgeClient {
  return new BridgeClient(clientType, config);
}
```

**Step 3: Update src/bridge/client.ts to re-export from shared**

Edit file to be a simple re-export:

```typescript
/**
 * Bridge Client - Extension entry point
 * Re-exports shared implementation
 */

export { BridgeClient, createBridgeClient } from '../../../shared/bridge/client';
```

**Step 4: Update src/background/index.ts import**

Change:
```typescript
import { createBridgeClient } from '../bridge/client';
```

To:
```typescript
import { createBridgeClient } from '../../../shared/bridge/client';
```

**Step 5: Verify build**

Run: `pnpm run compile`
Expected: No errors

**Step 6: Test extension**

Run: `pnpm run dev` and verify extension connects to bridge.

**Step 7: Commit**

```bash
git add shared/ src/bridge/
git commit -m "refactor: create shared BridgeClient module"
```

---

### Task 4.2: Update MCP server to use shared BridgeClient

**Files:**
- Modify: `mcp-server/index.ts`

**Step 1: Replace WebSocket implementation with shared BridgeClient**

Edit `mcp-server/index.ts`:

Remove duplicate WebSocket code (lines 22-68) and replace with:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BridgeClient, createBridgeClient } from '../shared/bridge/client';
import type { BridgeMessage, JsonValue } from '../types/bridge';

// Use shared BridgeClient
const bridgeClient = createBridgeClient('mcp-server');

// Set up message handler for responses
bridgeClient.setMessageHandler(async (message: BridgeMessage) => {
  if (message.type === 'response') {
    // Handle response - this will be managed by sendRequest
  }
});

// Set up connection callback
bridgeClient.onConnected(() => {
  console.error('[MCP] Connected to bridge');
});

bridgeClient.onDisconnected(() => {
  console.error('[MCP] Disconnected from bridge');
});

// Connect to bridge
bridgeClient.connect();
```

**Step 2: Replace sendExtensionMessage to use BridgeClient.sendRequest**

Edit the `sendExtensionMessage` function to use shared client:

```typescript
/**
 * Send a message to the Chrome extension via the WebSocket bridge
 */
async function sendExtensionMessage(toolName: string, params: Record<string, JsonValue>): Promise<JsonValue> {
  try {
    return await bridgeClient.sendRequest<JsonValue>(toolName, params);
  } catch (error) {
    throw new Error(
      'Bridge not connected. Please ensure the bridge server is running (pnpm run bridge) and the Chrome extension is connected.'
    );
  }
}
```

**Step 3: Remove old WebSocket cleanup code**

Remove `bridgeWs`, `bridgeReconnectTimer` related code since BridgeClient handles this internally.

**Step 4: Verify MCP server builds**

Run: `pnpm run mcp-server --version` or check with TypeScript:
Run: `pnpm run compile`
Expected: No errors

**Step 5: Test MCP server**

Run: `pnpm run bridge` in one terminal, then `pnpm run mcp-server` in another.

**Step 6: Commit**

```bash
git add mcp-server/index.ts
git commit -m "refactor: MCP server now uses shared BridgeClient"
```

---

## Phase 5: Storage Refactor with @webext-core/storage

### Task 5.1: Create unified storage module

**Files:**
- Create: `src/storage/index.ts`
- Modify: `src/core/config.ts`

**Step 1: Create src/storage/index.ts**

Create directory and file:

Run: `mkdir -p src/storage`

Create file:

```typescript
/**
 * Unified storage management using @webext-core/storage
 */

import { defineExtensionStorage } from '@webext-core/storage';
import { browser } from 'wxt/browser';
import type { LoggingConfig, BridgeConfig, AppConfig } from '../../types/config';
import { getDefaultConfig } from '../../types/config';

// Define all storage items
interface StorageItems {
  config: AppConfig;
  logs: Array<{
    timestamp: number;
    level: string;
    module: string;
    action: string;
    data?: unknown;
  }>;
}

// Create typed storage instance
export const { storage } = defineExtensionStorage<StorageItems>();

// Config management functions
export async function getConfig(): Promise<AppConfig> {
  const stored = await storage.getItem('config');
  return stored ?? getDefaultConfig();
}

export async function updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
  const current = await getConfig();
  const newConfig = {
    ...current,
    ...updates,
    // Deep merge nested objects
    ...(updates.logging && { logging: { ...current.logging, ...updates.logging } }),
    ...(updates.bridge && { bridge: { ...current.bridge, ...updates.bridge } }),
  };
  await storage.setItem('config', newConfig);
  return newConfig;
}

export async function resetConfig(): Promise<void> {
  await storage.removeItem('config');
}

// Logs management functions
export async function getLogs(limit?: number): Promise<Array<unknown>> {
  const logs = await storage.getItem('logs');
  if (!logs) return [];
  return limit ? logs.slice(-limit) : logs;
}

export async function addLog(log: unknown): Promise<void> {
  const logs = await storage.getItem('logs') || [];
  logs.push(log);

  // Trim if exceeds max size
  const maxSize = 1000;
  if (logs.length > maxSize) {
    logs.splice(0, logs.length - maxSize);
  }

  await storage.setItem('logs', logs);
}

export async function clearLogs(): Promise<void> {
  await storage.removeItem('logs');
}

// Storage watchers
export function onConfigChanged(callback: (newConfig: AppConfig) => void) {
  return storage.onChanged((changes) => {
    if (changes.config?.newValue) {
      callback(changes.config.newValue);
    }
  });
}
```

**Step 2: Update src/core/config.ts to use storage module**

Simplify config.ts to re-export from storage:

```typescript
/**
 * Configuration - re-exports from storage module
 */

export { getConfig, updateConfig, resetConfig } from '../storage';
export type { AppConfig, LoggingConfig, BridgeConfig } from '../../types/config';
export { getDefaultConfig } from '../../types/config';

// Keep defaultConfig for backward compatibility
import { getDefaultConfig as _getDefaultConfig } from '../../types/config';
export const defaultConfig = _getDefaultConfig();
```

**Step 3: Verify build**

Run: `pnpm run compile`
Expected: No errors

**Step 4: Commit**

```bash
git add src/storage/ src/core/config.ts
git commit -m "feat: implement unified storage with @webext-core/storage"
```

---

### Task 5.2: Update background script to use new storage

**Files:**
- Modify: `src/background/index.ts`

**Step 1: Update imports in src/background/index.ts**

Change:
```typescript
import { loadConfig, saveConfig, defaultConfig } from '../core/config';
```

To:
```typescript
import { getConfig, updateConfig, defaultConfig } from '../core/config';
```

**Step 2: Update initialization to use new storage functions**

Edit `initialize` function:

```typescript
export async function initialize() {
  config = await getConfig();  // Changed from loadConfig()
  logger.setConfig({ logging: config.logging });
  logger.info('Background', 'Initializing MCP in Browser extension');

  // ... rest of initialization ...
}
```

**Step 3: Update updateConfig function**

Edit `updateConfig` function:

```typescript
export async function updateConfig(newConfig: Partial<typeof config>) {
  config = await updateConfig(newConfig);  // Now async

  // Update dependent configs
  logger.setConfig({ logging: config.logging });
  globalTaskQueue.setConfig({ concurrency: config.concurrency });
  bridgeClient?.setConfig({ bridge: config.bridge });

  logger.info('Background', 'Configuration updated', { newConfig });
}
```

Wait, there's a naming conflict. Let's fix:

```typescript
export async function updateBackgroundConfig(newConfig: Partial<typeof config>) {
  config = await updateConfig(newConfig);

  // Update dependent configs
  logger.setConfig({ logging: config.logging });
  globalTaskQueue.setConfig({ concurrency: config.concurrency });
  bridgeClient?.setConfig({ bridge: config.bridge });

  logger.info('Background', 'Configuration updated', { newConfig });
}
```

**Step 4: Verify build and test**

Run: `pnpm run compile`
Expected: No errors

Run: `pnpm run dev` and test configuration persistence.

**Step 5: Commit**

```bash
git add src/background/index.ts
git commit -m "refactor: background script now uses unified storage"
```

---

## Phase 6: Final Cleanup and Documentation

### Task 6.1: Remove old messaging/protocol.ts

**Files:**
- Delete: `messaging/protocol.ts`

**Step 1: Verify it's not being imported**

Run: `grep -r "messaging/protocol" --include="*.ts" --include="*.vue" .`
Expected: No results (or only in this file itself)

**Step 2: Delete the old protocol file**

Run: `rm messaging/protocol.ts`

**Step 3: Delete messaging directory if empty**

Run: `ls messaging/`

If empty or only contains deleted file:
```bash
rmdir messaging/
```

**Step 4: Verify build**

Run: `pnpm run compile`
Expected: No errors

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old messaging/protocol.ts"
```

---

### Task 6.2: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Step 1: Update CLAUDE.md with new architecture**

Add sections about:
- Unified messaging system
- Shared bridge client
- Storage management
- Type organization

**Step 2: Update README.md**

Remove references to popup/sidepanel if mentioned.

**Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update documentation for refactored architecture"
```

---

### Task 6.3: Final verification and cleanup

**Step 1: Run full type check**

Run: `pnpm run compile`
Expected: Zero errors

**Step 2: Test build**

Run: `pnpm run build`
Expected: Successful build

**Step 3: Clean up any remaining unused imports**

Run: `pnpm run lint` (if ESLint is configured)
Fix any warnings.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after WXT integration refactor"
```

---

## Testing Checklist

After completing all phases, verify:

- [ ] Extension builds without errors
- [ ] Extension loads in Chrome/Firefox
- [ ] Bridge connection works
- [ ] MCP server connects to bridge
- [ ] All tools function correctly
- [ ] Configuration persists across reloads
- [ ] Content scripts respond to messages
- [ ] Screenshots work
- [ ] Tab management works
- [ ] Page interactions work (click, fill, etc.)

---

**Estimated completion:** ~2-3 hours

**Key files modified:** ~20 files

**Lines of code removed:** ~400-500

**Net improvement:** Better type safety, less duplication, proper WXT integration
