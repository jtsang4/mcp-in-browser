# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension built with **WXT** (Web Extension Tools) and **Vue 3** + TypeScript. WXT is a framework that provides file-based routing for browser extension entry points and handles cross-browser builds (Chrome/Firefox).

## Development Commands

```bash
# Development (with hot reload)
npm run dev           # Chrome
npm run dev:firefox   # Firefox

# Production builds
npm run build           # Chrome
npm run build:firefox   # Firefox

# Create distributable packages
npm run zip             # Chrome
npm run zip:firefox     # Firefox

# Type checking
npm run compile     # Run vue-tsc type checking
```

## Architecture

### Entry Points Convention

WXT uses a file-based routing system in `entrypoints/`:

- `background.ts` - Service worker/background script using `defineBackground()`
- `content.ts` - Content script injected into web pages using `defineContentScript()`
- `popup/` - Browser action popup UI (Vue 3 app)

Each file in `entrypoints/` automatically becomes an extension entry point.

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
npm run dev:firefox
npm run build:firefox
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
pnpm i @webext-core/storage
pnpm i @webext-core/messaging
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

## Build Output

- `.output/` - Build output directory (git-ignored)
- `.wxt/` - Generated WXT files (git-ignored)
- `web-ext.config.ts` - Auto-generated web-ext config (git-ignored)
