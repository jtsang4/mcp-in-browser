# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **MCP in Browser** - a browser automation Chrome/Firefox extension built with **WXT** (Web Extension Tools) and **Vue 3** + TypeScript. The project provides browser automation tools to Claude Code via the Model Context Protocol (MCP).

### Architecture

The project uses a bridge architecture for communication between the MCP server and the browser extension:

1. **MCP Server** (`mcp-server/index.ts`) - Node.js server that implements MCP protocol
2. **WebSocket Bridge** (`mcp-server/bridge.ts`) - Forwards messages between MCP server and extension
3. **Browser Extension** - Chrome/Firefox extension that executes browser automation
4. **Extension Bridge Client** (`background-bridge.ts`) - WebSocket client in the extension

```
Claude Code → MCP Server → WebSocket Bridge → Extension (background-bridge.ts) → Content Scripts
```

## Development Commands

```bash
# Development (with hot reload)
pnpm run dev           # Chrome
pnpm run dev:firefox   # Firefox

# Production builds
pnpm run build           # Chrome
pnpm run build:firefox   # Firefox

# Create distributable packages
pnpm run zip             # Chrome
pnpm run zip:firefox     # Firefox

# Type checking
pnpm run compile     # Run vue-tsc type checking

# Bridge server (required for MCP server to communicate with extension)
pnpm run bridge

# MCP server (for testing)
pnpm run mcp-server
pnpm run mcp-server:dev  # With watch mode
```

## Architecture

### Entry Points Convention

WXT uses a file-based routing system in `entrypoints/`:

- `background.ts` - Service worker/background script using `defineBackground()`
- `content.ts` - Content script injected into web pages using `defineContentScript()`
- `popup/` - Browser action popup UI (Vue 3 app)
- `sidepanel/` - Side panel UI (Vue 3 app)

Each file in `entrypoints/` automatically becomes an extension entry point.

### Bridge Architecture

The bridge is a WebSocket server that connects the MCP server (Node.js) with the browser extension:

1. **Start the bridge**: `pnpm run bridge` - Runs on `ws://localhost:37373`
2. **Extension connects**: The extension automatically connects to the bridge via `background-bridge.ts`
3. **MCP server connects**: The MCP server connects to the bridge when started

Message flow:
- Tool calls: MCP Server → Bridge → Extension → Content Scripts
- Responses: Content Scripts → Extension → Bridge → MCP Server

### Content Script Matching

Content scripts specify URL patterns via the `matches` option:

```typescript
export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() { /* ... */ },
});
```

### Vue Integration

- Uses `<script setup>` syntax (Composition API)
- Import alias: `@/` references project root (e.g., `@/components/HelloWorld.vue`)
- Popup initialized in `entrypoints/popup/main.ts`

### Configuration

- `wxt.config.ts` - WXT framework configuration with `@wxt-dev/module-vue`
- `tsconfig.json` - Extends `.wxt/tsconfig.json` (generated during build)
- `.wxt/` directory is auto-generated and git-ignored

### Browser Targets

Add `-b firefox` or `:firefox` suffix to any command to target Firefox:
```bash
pnpm run dev:firefox
pnpm run build:firefox
```

### Extension Icons

Place icons in `public/icon/` with standard sizes: 16, 32, 48, 96, 128 PNG.

## WebExt Core Libraries

This project can leverage **[@webext-core](https://webext-core.aklinker1.io/)** libraries - a collection of utilities that simplify web extension development with type-safe, cross-browser APIs. Full documentation: https://webext-core.aklinker1.io/

### Available Packages

| Package | Description |
|---------|-------------|
| `@webext-core/storage` | Type-safe API for extension storage (similar to localStorage) |
| `@webext-core/messaging` | Simplified, type-safe message passing between contexts |
| `@webext-core/proxy-service` | Execute functions in background context from anywhere |
| `@webext-core/job-scheduler` | Schedule and manage recurring jobs |
| `@webext-core/match-patterns` | Utilities for working with match patterns |
| `@webext-core/isolated-element` | Create style-isolated containers for content scripts |
| `@webext-core/fake-browser` | In-memory webextension-polyfill implementation for testing |

### Installation

```bash
ppnpm add @webext-core/storage
ppnpm add @webext-core/messaging
# etc.
```

### Example: Messaging

```typescript
// messaging.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  getStringLength(data: string): number;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

// background.ts
onMessage('getStringLength', ({ data }) => data.length);

// content.ts or popup
const length = await sendMessage('getStringLength', 'hello');
```

### Example: Proxy Service

```typescript
// MathService.ts
import { defineProxyService } from '@webext-core/proxy-service';

class MathService {
  async fibonacci(n: number): Promise<number> { /* ... */ }
}

export const [registerMathService, getMathService] = defineProxyService(
  'MathService',
  () => new MathService(),
);

// background.ts - register the service
registerMathService();

// Anywhere else - call methods that execute in background
const mathService = getMathService();
await mathService.fibonacci(100);
```

## Key Files

### `background-bridge.ts`

Extension WebSocket client that connects to the bridge server:

- Automatically connects on service worker startup
- Handles incoming tool calls from the MCP server
- Sends responses back through the bridge
- Auto-reconnects on disconnection

### `mcp-server/bridge.ts`

WebSocket bridge server that forwards messages:

- Listens on `ws://localhost:37373`
- Tracks both extension and MCP server clients
- Forwards `tool_call` messages from MCP server to extension
- Forwards `response` messages from extension to MCP server

### `mcp-server/index.ts`

MCP server implementation:

- Implements the MCP protocol (stdio transport)
- Defines all browser automation tools
- Connects to the bridge via WebSocket
- Forwards tool calls and receives responses

### `types/index.ts`

TypeScript definitions for all tool inputs/outputs.

## Build Output

- `.output/` - Build output directory (git-ignored)
- `.wxt/` - Generated WXT files (git-ignored)
- `web-ext.config.ts` - Auto-generated web-ext config (git-ignored)
