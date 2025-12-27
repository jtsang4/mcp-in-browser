# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **MCP in Browser** - a browser automation Chrome/Firefox extension built with **WXT** (Web Extension Tools) and TypeScript. The project provides browser automation tools to Claude Code via the Model Context Protocol (MCP).

### Architecture

The project uses a bridge architecture for communication between the MCP server and the browser extension:

1. **MCP Server** (`mcp-server/index.ts`) - Node.js server that implements MCP protocol
2. **WebSocket Bridge** (`mcp-server/bridge.ts`) - Forwards messages between MCP server and extension
3. **Browser Extension** - Chrome/Firefox extension that executes browser automation
4. **Shared Bridge Client** (`shared/bridge/client.ts`) - Unified WebSocket client used by both extension and MCP server
5. **Unified Messaging** (`entrypoints/messaging/`) - Type-safe messaging using @webext-core/messaging

```
Claude Code → MCP Server → Shared BridgeClient → WebSocket Bridge → Extension → Content Scripts
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
- `messaging/` - Unified messaging protocol and handlers using @webext-core/messaging

Each file in `entrypoints/` automatically becomes an extension entry point.

### Shared Modules

The `shared/` directory contains code shared between the extension and MCP server:

- `shared/bridge/client.ts` - Unified BridgeClient implementation
- `shared/storage/index.ts` - Storage helper functions

### Type Organization

Type definitions are organized in `types/`:

- `types/index.ts` - Core types (JsonValue, JsonSchema)
- `types/bridge.ts` - Bridge message and client types
- `types/messaging.ts` - Content script messaging types
- `types/tools.ts` - Tool handler and definition types
- `types/config.ts` - Configuration types

### Bridge Architecture

The bridge is a WebSocket server that connects the MCP server (Node.js) with the browser extension:

1. **Start the bridge**: `pnpm run bridge` - Runs on `ws://localhost:37373`
2. **Extension connects**: The extension automatically connects to the bridge via shared BridgeClient
3. **MCP server connects**: The MCP server connects to the bridge when started using the same shared BridgeClient

Message flow:
- Tool calls: MCP Server → Shared BridgeClient → WebSocket Bridge → Extension → Content Scripts
- Responses: Content Scripts → Extension → WebSocket Bridge → Shared BridgeClient → MCP Server

### Content Script Matching

Content scripts specify URL patterns via the `matches` option:

```typescript
export default defineContentScript({
  matches: ['<all_urls>'],
  main() { /* ... */ },
});
```

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

This project uses **[@webext-core](https://webext-core.aklinker1.io/)** libraries for type-safe, cross-browser APIs. Full documentation: https://webext-core.aklinker1.io/

### Packages in Use

| Package | Usage |
|---------|-------|
| `@webext-core/messaging` | Unified messaging protocol between extension contexts (see `entrypoints/messaging/protocol.ts`) |
| `@webext-core/storage` | Type-safe storage (via WXT's storage utilities in `src/core/config.ts`) |

### Unified Messaging Protocol

The project uses `@webext-core/messaging` for type-safe messaging:

**Protocol Definition** (`entrypoints/messaging/protocol.ts`):
```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ExtensionProtocolMap {
  navigate: (input: { url: string; tabId?: number }) => Promise<{ success: boolean }>;
  click: (input: { selector: string; tabId?: number }) => Promise<{ success: boolean; error?: string }>;
  // ... more tool definitions
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ExtensionProtocolMap>();
```

**Content Script Handlers** (`entrypoints/messaging/content-handlers.ts`):
```typescript
import { onMessage } from './protocol';

onMessage('click', async ({ data }) => {
  return await Interactions.click(data.selector, data.options || {});
});
```

**Background Script Usage** (`src/background/tools.ts`):
```typescript
import { sendMessage } from '../../entrypoints/messaging/protocol';

export const clickTool: ToolHandler = async (params) => {
  const validated = Schemas.click.parse(params);
  return await sendMessage('click', {
    selector: validated.selector,
    tabId: validated.tabId,
  });
};
```

## Key Files

### `shared/bridge/client.ts`

Unified BridgeClient implementation used by both extension and MCP server:

- Automatically connects to the bridge WebSocket server
- Handles message queuing and reconnection
- Provides `sendRequest()` for request/response pattern
- Provides `sendMessage()` for fire-and-forget messages

### `entrypoints/messaging/protocol.ts`

Defines the unified messaging protocol using @webext-core/messaging:

- `ExtensionProtocolMap` interface defining all available messages
- `sendMessage()` function for sending messages
- `onMessage()` function for registering handlers

### `entrypoints/messaging/content-handlers.ts`

Content script message handlers that:
- Register with `onMessage()` for each tool type
- Call functions from `src/content/` modules
- Return properly typed responses

### `entrypoints/messaging/background-handlers.ts`

Background script message handlers that:
- Handle browser APIs (tabs, screenshots, navigation)
- Register with `onMessage()` for background-specific tools

### `src/background/tools.ts`

Tool definitions and handlers that:
- Define tool schemas using Zod
- Use `sendMessage()` from unified messaging protocol
- Provide tool descriptions for MCP server

### `mcp-server/bridge.ts`

WebSocket bridge server that:
- Listens on `ws://localhost:37373`
- Tracks connected extension and MCP server clients
- Forwards `tool_call` messages from MCP server to extension
- Forwards `response` messages from extension to MCP server

### `mcp-server/index.ts`

MCP server implementation that:
- Implements the MCP protocol (stdio transport)
- Uses shared BridgeClient to connect to the bridge
- Defines all browser automation tools
- Handles tool calls from Claude Code

## Build Output

- `.output/` - Build output directory (git-ignored)
- `.wxt/` - Generated WXT files (git-ignored)
- `web-ext.config.ts` - Auto-generated web-ext config (git-ignored)
